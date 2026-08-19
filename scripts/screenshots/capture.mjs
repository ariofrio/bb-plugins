// Frames each shot: opens the seeded bb in Chromium, lets the shot arrange the
// UI, shades everything except the parts the plugin adds, and crops to a 16:9
// rectangle around them.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";

export const ASPECT_RATIO = 16 / 9;
/** bb's own default window: DEFAULT_WINDOW_WIDTH x DEFAULT_WINDOW_HEIGHT. */
export const VIEWPORT = { width: 1280, height: 900 };
/**
 * Every README-table shot is cropped to this width, so the five cells share one
 * zoom level and the UI reads at the same size in each. Only where each crop
 * sits differs, because each plugin adds something somewhere else.
 */
export const CARD_WIDTH = 560;
export const THEMES = ["light", "dark"];

export const FULL_WINDOW_FILE = (theme) => `screenshot-${theme}.png`;
export const CARD_FILE = (theme) => `card-${theme}.png`;

/** The mode a split shot pairs with the one it is named for. */
const OTHER_THEME = { light: "dark", dark: "light" };

/**
 * Grows a box into a 16:9 window that stays inside the viewport, so shots of
 * the same area come out the same size and line up next to each other.
 */
export function cropRectangle({
  box,
  padding,
  width: fixedWidth,
  viewport,
  align = "center",
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
  // A column taller than the crop has no meaningful centre; "start" frames it
  // from its top instead, which is where a sidebar begins.
  const top = align === "start" ? box.y - padding : box.y + box.height / 2 - height / 2;
  return {
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round(Math.min(Math.max(centerX - width / 2, 0), viewport.width - width)),
    y: Math.round(Math.min(Math.max(top, 0), viewport.height - height)),
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
    const anchor = box.keysAnchor ?? "center";
    const along = { start: 0, center: 0.5, end: 1 }[anchor];
    const shift = { start: "0", center: "-50%", end: "-100%" }[anchor];
    const inset = anchor === "center" ? 0 : gap * (anchor === "start" ? 1 : -1);
    const acrossX = box.x + box.width * along + inset;
    const acrossY = box.y + box.height * along + inset;
    const anchors = {
      below: [acrossX, box.y + box.height + gap, shift, "0"],
      above: [acrossX, box.y - gap, shift, "-100%"],
      left: [box.x - gap, acrossY, "-100%", shift],
      right: [box.x + box.width + gap, acrossY, "0", shift],
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

export async function openApp({ browser, stack, theme, viewport, style }) {
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
  if (style !== undefined) {
    await context.addInitScript((css) => {
      const sheet = document.createElement("style");
      sheet.textContent = css;
      document.addEventListener("DOMContentLoaded", () =>
        document.head.append(sheet),
      );
    }, style);
  }
  const page = await context.newPage();
  await page.goto(stack.serverUrl, { waitUntil: "networkidle" });
  return { context, page };
}

/**
 * Joins two captures along the diagonal, which is how the theme plugin shows
 * both of its palettes in one image. The base holds the top-left triangle, so
 * a reader meets the mode they are already in and sees the other alongside it.
 */
async function writeDiagonalSplit({ browser, base, corner, output, size }) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
  const sheet = await context.newPage();
  await sheet.setContent(
    `<body style="margin:0"><canvas id="c" width="${size.width * 2}" height="${size.height * 2}" style="width:${size.width}px;height:${size.height}px;display:block"></canvas></body>`,
  );
  await sheet.evaluate(
    async ({ baseUrl, cornerUrl }) => {
      const load = (url) =>
        new Promise((resolve) => {
          const image = new Image();
          image.addEventListener("load", () => resolve(image));
          image.src = url;
        });
      const canvas = document.getElementById("c");
      const drawing = canvas.getContext("2d");
      drawing.drawImage(await load(baseUrl), 0, 0);
      drawing.save();
      drawing.beginPath();
      drawing.moveTo(canvas.width, 0);
      drawing.lineTo(canvas.width, canvas.height);
      drawing.lineTo(0, canvas.height);
      drawing.closePath();
      drawing.clip();
      drawing.drawImage(await load(cornerUrl), 0, 0);
      drawing.restore();
    },
    {
      baseUrl: `data:image/png;base64,${base.toString("base64")}`,
      cornerUrl: `data:image/png;base64,${corner.toString("base64")}`,
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
      // A split shot's own frames are ingredients: each output pairs one mode's
      // frame with the other's, so nothing is written until both exist.
      const files = shot.split ? {} : shotFiles(shot);
      await shot.setup?.({ fixture, stack });
      const frames = { fullWindow: {}, card: {} };
      for (const theme of shot.themes ?? THEMES) {
        const takeCard = async ({ page, focusBoxes }, viewport) => {
          const clip = cropRectangle({
            box: unionBox(focusBoxes),
            padding: shot.focusPadding ?? 20,
            width: CARD_WIDTH,
            align: shot.focusAlign,
            viewport,
          });
          frames.card.clip = clip;
          return await page.screenshot({
            ...pathFor(files, CARD_FILE(theme)),
            clip,
          });
        };
        if (shot.card === undefined) {
          const [fullWindow, card] = await render({
            browser,
            stack,
            fixture,
            shot,
            theme,
            async take(frame) {
              return [
                await frame.page.screenshot({
                  ...pathFor(files, FULL_WINDOW_FILE(theme)),
                  clip: { x: 0, y: 0, ...VIEWPORT },
                }),
                await takeCard(frame, VIEWPORT),
              ];
            },
          });
          frames.fullWindow[theme] = fullWindow;
          frames.card[theme] = card;
          continue;
        }
        // A shot whose subject is dwarfed by bb's default window asks for a
        // smaller one for its card. The crop width does not change with it, so
        // the card still reads at the same zoom as every other card; only the
        // window around the subject shrinks.
        frames.fullWindow[theme] = await render({
          browser,
          stack,
          fixture,
          shot,
          theme,
          take: (frame) =>
            frame.page.screenshot({
              ...pathFor(files, FULL_WINDOW_FILE(theme)),
              clip: { x: 0, y: 0, ...VIEWPORT },
            }),
        });
        frames.card[theme] = await render({
          browser,
          stack,
          fixture,
          shot,
          theme,
          viewport: shot.card.viewport,
          style: shot.card.style,
          take: (frame) => takeCard(frame, shot.card.viewport),
        });
      }
      if (shot.split) {
        const outputs = shotFiles(shot);
        for (const theme of shot.themes ?? THEMES) {
          const other = OTHER_THEME[theme];
          for (const [name, taken, size] of [
            [FULL_WINDOW_FILE(theme), frames.fullWindow, VIEWPORT],
            [CARD_FILE(theme), frames.card, frames.card.clip],
          ]) {
            if (outputs[name] === undefined) continue;
            await writeDiagonalSplit({
              browser,
              base: taken[theme],
              corner: taken[other],
              output: outputs[name],
              size: { width: size.width, height: size.height },
            });
          }
        }
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

function pathFor(files, name) {
  const output = files[name];
  if (output === undefined) return {};
  mkdirSync(dirname(output), { recursive: true });
  return { path: output };
}

/**
 * Arranges the app, shades it, and hands the page to whoever wants a frame of
 * it. Each frame gets its own window, because a card may want a different one.
 */
async function render({ browser, stack, fixture, shot, theme, viewport, style, take }) {
  const { context, page } = await openApp({ browser, stack, theme, viewport, style });
  try {
    await shot.prepare({ page, fixture, stack, theme });
    const highlightBoxes = await highlightBoxesFor({ page, shot });
    let chipBoxes = [];
    if (highlightBoxes.length > 0) {
      chipBoxes = await page.evaluate(paintOverlay, {
        boxes: highlightBoxes,
        dim: theme === "dark" ? "rgba(0,0,0,0.66)" : "rgba(15,15,15,0.42)",
        id: OVERLAY_ID,
        keyStyle: keyChipStyle(theme),
      });
    }
    // The card frames what the plugin adds; the keys drawn onto the shade are
    // part of that, and so is anything the shot points at by hand.
    const focusBoxes = [
      ...(shot.focus
        ? await boxesFor(shot.focus(page), { label: `${shot.id} focus` })
        : highlightBoxes),
      ...chipBoxes,
    ];
    return await take({ page, focusBoxes });
  } finally {
    await context.close();
  }
}

/** Measures and pads everything a shot lifts out of the shade. */
async function highlightBoxesFor({ page, shot }) {
  const highlightBoxes = [];
  for (const highlight of shot.highlights?.(page) ?? []) {
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
              keysAnchor: highlight.keysAnchor,
            },
      ),
    );
  }
  return highlightBoxes;
}
