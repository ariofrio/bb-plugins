// Frames each shot: opens the seeded bb in Chromium, lets the shot arrange the
// UI, shades everything except the parts the plugin adds, and crops to a 16:9
// rectangle around them.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";

export const ASPECT_RATIO = 16 / 9;
export const VIEWPORT = { width: 1280, height: 720 };
export const THEMES = ["light", "dark"];

/**
 * Grows a box into a 16:9 window that stays inside the viewport, so shots of
 * the same area come out the same size and line up next to each other.
 */
export function cropRectangle({
  box,
  padding,
  width: fixedWidth,
  viewport,
  aspectRatio = ASPECT_RATIO,
}) {
  let width = fixedWidth ?? box.width + padding * 2;
  let height = fixedWidth === undefined ? box.height + padding * 2 : width / aspectRatio;
  if (width / height > aspectRatio) height = width / aspectRatio;
  else width = height * aspectRatio;
  if (width > viewport.width) {
    width = viewport.width;
    height = width / aspectRatio;
  }
  if (height > viewport.height) {
    height = viewport.height;
    width = height * aspectRatio;
  }
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return {
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round(Math.min(Math.max(centerX - width / 2, 0), viewport.width - width)),
    y: Math.round(Math.min(Math.max(centerY - height / 2, 0), viewport.height - height)),
  };
}

export function unionBox(boxes) {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  return {
    x: left,
    y: top,
    width: Math.max(...boxes.map((box) => box.x + box.width)) - left,
    height: Math.max(...boxes.map((box) => box.y + box.height)) - top,
  };
}

const OVERLAY_ID = "bb-plugins-screenshot-overlay";
const MINIMUM_CUTOUT_RADIUS = 8;

/** A shortcut has no UI of its own, so the keys are drawn onto the shade. */
function keyChipStyle(theme) {
  const ink = theme === "dark" ? "#f5f5f5" : "#ffffff";
  const fill = theme === "dark" ? "rgba(32,32,32,0.96)" : "rgba(24,24,24,0.92)";
  const edge = theme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.18)";
  return [
    `background:${fill}`,
    `color:${ink}`,
    `border:1px solid ${edge}`,
    "border-radius:8px",
    "padding:6px 12px",
    "font: 600 17px/1 ui-sans-serif, -apple-system, system-ui, sans-serif",
    "letter-spacing:0.06em",
    "white-space:nowrap",
    "box-shadow:0 6px 20px rgba(0,0,0,0.45)",
  ].join(";");
}

/**
 * Runs in the page: shades everything outside the measured rectangles, and
 * writes each box's keys, when it has them, on the shaded side.
 */
function paintOverlay({ boxes, dim, id, keyStyle }) {
  document.getElementById(id)?.remove();
  const svgNamespace = "http://www.w3.org/2000/svg";

  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none";

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.cssText = "position:absolute;inset:0";

  const mask = document.createElementNS(svgNamespace, "mask");
  mask.setAttribute("id", `${id}-mask`);
  const cover = document.createElementNS(svgNamespace, "rect");
  cover.setAttribute("width", "100%");
  cover.setAttribute("height", "100%");
  cover.setAttribute("fill", "white");
  mask.append(cover);

  for (const box of boxes) {
    const hole = document.createElementNS(svgNamespace, "rect");
    hole.setAttribute("x", String(box.x));
    hole.setAttribute("y", String(box.y));
    hole.setAttribute("width", String(box.width));
    hole.setAttribute("height", String(box.height));
    hole.setAttribute("rx", String(box.radius));
    hole.setAttribute("fill", "black");
    mask.append(hole);
  }

  const shade = document.createElementNS(svgNamespace, "rect");
  shade.setAttribute("width", "100%");
  shade.setAttribute("height", "100%");
  shade.setAttribute("fill", dim);
  shade.setAttribute("mask", `url(#${id}-mask)`);

  svg.append(mask, shade);
  overlay.append(svg);

  const chipBoxes = [];
  for (const box of boxes) {
    if (!box.keys) continue;
    const chip = document.createElement("div");
    chip.textContent = box.keys;
    const gap = 14;
    const placement =
      box.keysPlacement ??
      (box.y + box.height + 56 < window.innerHeight ? "below" : "above");
    const anchors = {
      below: [box.x + box.width / 2, box.y + box.height + gap, "-50%", "0"],
      above: [box.x + box.width / 2, box.y - gap, "-50%", "-100%"],
      left: [box.x - gap, box.y + box.height / 2, "-100%", "-50%"],
      right: [box.x + box.width + gap, box.y + box.height / 2, "0", "-50%"],
    };
    const [left, top, shiftX, shiftY] = anchors[placement];
    chip.style.cssText = `position:absolute;left:${left}px;top:${top}px;transform:translate(${shiftX}, ${shiftY});${keyStyle}`;
    overlay.append(chip);
    chipBoxes.push(chip);
  }

  document.body.append(overlay);
  // The keys are part of the picture, so the crop has to make room for them.
  return chipBoxes.map((chip) => {
    const rectangle = chip.getBoundingClientRect();
    return {
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width,
      height: rectangle.height,
    };
  });
}

/**
 * Measures each match in the page rather than through boundingBox(), because a
 * cutout that does not carry the element's own corner radius reads as a sticker
 * laid over the UI instead of a hole cut around it.
 */
async function boxesFor(locators, { label }) {
  const boxes = [];
  for (const locator of locators) {
    const measured = await locator.evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const rectangle = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const corner = (value) => {
            const number = Number.parseFloat(value);
            if (Number.isNaN(number)) return 0;
            return value.trimStart().endsWith("%")
              ? (Math.min(rectangle.width, rectangle.height) * number) / 100
              : number;
          };
          return {
            x: rectangle.x,
            y: rectangle.y,
            width: rectangle.width,
            height: rectangle.height,
            radius: Math.max(
              corner(style.borderTopLeftRadius),
              corner(style.borderTopRightRadius),
              corner(style.borderBottomLeftRadius),
              corner(style.borderBottomRightRadius),
            ),
          };
        })
        .filter((box) => box.width > 0 && box.height > 0),
    );
    if (measured.length === 0) {
      throw new Error(`${label}: nothing visible matched ${locator}`);
    }
    boxes.push(...measured);
  }
  return boxes;
}

/**
 * Growing a rounded rectangle by p grows its corners by p too. Square-cornered
 * elements still get a rounded cutout, because a sharp one reads as a crop mark
 * rather than a highlight, and no corner can exceed half the shorter side.
 */
function padBox(box, padding) {
  const width = box.width + padding * 2;
  const height = box.height + padding * 2;
  return {
    x: box.x - padding,
    y: box.y - padding,
    width,
    height,
    radius: Math.min(
      Math.max((box.radius ?? 0) + padding, MINIMUM_CUTOUT_RADIUS),
      Math.min(width, height) / 2,
    ),
  };
}

export async function openApp({ browser, stack, theme, viewport }) {
  const context = await browser.newContext({
    viewport: viewport ?? VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  // bb resolves its palette from this key before first paint, so the app never
  // renders in the wrong mode and no theme toggle has to be clicked.
  await context.addInitScript(
    (mode) => window.localStorage.setItem("bb.theme", mode),
    theme,
  );
  const page = await context.newPage();
  await page.goto(stack.serverUrl, { waitUntil: "networkidle" });
  return { context, page };
}

/**
 * Joins a light and a dark capture along the diagonal, which is how the theme
 * plugin shows both of its palettes in one README cell.
 */
async function writeDiagonalSplit({ browser, light, dark, output, size }) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
  const sheet = await context.newPage();
  await sheet.setContent(
    `<body style="margin:0"><canvas id="c" width="${size.width * 2}" height="${size.height * 2}" style="width:${size.width}px;height:${size.height}px;display:block"></canvas></body>`,
  );
  await sheet.evaluate(
    async ({ lightUrl, darkUrl }) => {
      const load = (url) =>
        new Promise((resolve) => {
          const image = new Image();
          image.addEventListener("load", () => resolve(image));
          image.src = url;
        });
      const canvas = document.getElementById("c");
      const drawing = canvas.getContext("2d");
      drawing.drawImage(await load(lightUrl), 0, 0);
      drawing.save();
      drawing.beginPath();
      drawing.moveTo(canvas.width, 0);
      drawing.lineTo(canvas.width, canvas.height);
      drawing.lineTo(0, canvas.height);
      drawing.closePath();
      drawing.clip();
      drawing.drawImage(await load(darkUrl), 0, 0);
      drawing.restore();
    },
    {
      lightUrl: `data:image/png;base64,${light.toString("base64")}`,
      darkUrl: `data:image/png;base64,${dark.toString("base64")}`,
    },
  );
  mkdirSync(dirname(output), { recursive: true });
  await sheet.locator("#c").screenshot({ path: output });
  await context.close();
}

export async function capture({ stack, fixture, shots, shotFiles }) {
  const browser = await chromium.launch();
  const captured = [];
  try {
    for (const shot of shots) {
      const files = shotFiles(shot);
      await shot.setup?.({ fixture, stack });
      const themeShots = {};
      for (const theme of shot.themes ?? THEMES) {
        const { context, page } = await openApp({
          browser,
          stack,
          theme,
          viewport: shot.viewport,
        });
        try {
          await shot.prepare({ page, fixture, stack, theme });
          const viewport = shot.viewport ?? VIEWPORT;
          const highlights = shot.highlights?.(page) ?? [];
          const highlightBoxes = [];
          for (const highlight of highlights) {
            const boxes = await boxesFor([highlight.locator], {
              label: `${shot.id} highlight`,
            });
            // Just enough to keep the shade off the element's own edge.
            const padding = highlight.padding ?? 2;
            const padded = highlight.merge
              ? [
                  padBox(
                    {
                      ...unionBox(boxes),
                      radius: Math.max(...boxes.map((box) => box.radius ?? 0)),
                    },
                    padding,
                  ),
                ]
              : boxes.map((box) => padBox(box, padding));
            highlightBoxes.push(
              ...padded.map((box) =>
                highlight.keys === undefined
                  ? box
                  : {
                      ...box,
                      keys: highlight.keys,
                      keysPlacement: highlight.keysPlacement,
                    },
              ),
            );
          }
          let chipBoxes = [];
          if (highlightBoxes.length > 0) {
            chipBoxes = await page.evaluate(paintOverlay, {
              boxes: highlightBoxes,
              dim: theme === "dark" ? "rgba(0,0,0,0.66)" : "rgba(15,15,15,0.42)",
              id: OVERLAY_ID,
              keyStyle: keyChipStyle(theme),
            });
          }
          const anchorBoxes = [
            ...(shot.crop.anchors
              ? await boxesFor(shot.crop.anchors(page), { label: `${shot.id} crop` })
              : highlightBoxes),
            ...chipBoxes,
          ];
          const clip = cropRectangle({
            box: unionBox(anchorBoxes),
            padding: shot.crop.padding ?? 24,
            width: shot.crop.width,
            viewport,
          });
          const output = files[shot.outputFor(theme)];
          mkdirSync(dirname(output), { recursive: true });
          themeShots[theme] = { buffer: await page.screenshot({ path: output, clip }), clip };
        } finally {
          await context.close();
        }
      }
      if (shot.split !== undefined) {
        await writeDiagonalSplit({
          browser,
          light: themeShots.light.buffer,
          dark: themeShots.dark.buffer,
          output: files[shot.split],
          size: {
            width: themeShots.light.clip.width,
            height: themeShots.light.clip.height,
          },
        });
      }
      await shot.teardown?.({ fixture, stack });
      captured.push(shot);
      console.log(`  ${shot.id}`);
    }
  } finally {
    await browser.close();
  }
  return captured;
}
