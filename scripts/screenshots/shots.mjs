import { SIDE_CHAT_QUESTION } from "./fixture.mjs";

// What each plugin's screenshot pictures. Every shot starts from the same
// seeded bb, so shots of the same area frame the same pixels and readers can
// compare them side by side.
const THEME_FILES = ["screenshot-light.png", "screenshot-dark.png"];

/** Both thread-header shots frame the same rectangle. */
const HEADER_SHOT_WIDTH = 720;

function themedOutput(theme) {
  return `screenshot-${theme}.png`;
}

/** The right panel the ⇧⌘L side chat opens into. */
function sideChatPanel(page) {
  return page
    .locator("aside")
    .filter({ has: page.getByRole("textbox", { name: "Reply…" }) });
}

/** Opens the thread every shot is framed around. */
async function openFeaturedThread(page) {
  await page
    .getByRole("link", { name: /^Open Polish analytics dashboard/ })
    .click();
  await page.getByText("Dashboard polish is in place.").waitFor();
  await page.waitForTimeout(600);
}

export const SHOTS = [
  {
    id: "project-breadcrumbs",
    plugin: "bb-plugin-project-breadcrumbs",
    outputs: THEME_FILES,
    outputFor: themedOutput,
    async prepare({ page }) {
      await openFeaturedThread(page);
      // The open menu marks the header aria-hidden, so the trigger has to be
      // found by attribute rather than by role.
      await page.locator('[aria-label="Atlas actions"]').click();
      await page.getByRole("menu").waitFor();
      await page.waitForTimeout(400);
    },
    highlights: (page) => [
      { locator: page.locator('[aria-label="Atlas actions"]') },
      { locator: page.getByRole("menu") },
    ],
    crop: {
      anchors: (page) => [
        page.locator('[aria-label="Atlas actions"]'),
        page.getByRole("menu"),
      ],
      // The header shots share this width so they can be read side by side.
      width: HEADER_SHOT_WIDTH,
    },
  },
  {
    id: "project-icons",
    plugin: "bb-plugin-project-icons",
    outputs: THEME_FILES,
    outputFor: themedOutput,
    async prepare({ page }) {
      await openFeaturedThread(page);
      await page.locator('[aria-label="Icon for Atlas"]').click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(600);
    },
    highlights: (page) => [
      { locator: page.locator('[aria-label="Icon for Atlas"]') },
      { locator: page.getByRole("dialog") },
    ],
    crop: {
      // Anchored on the picker's search field rather than the whole picker, so
      // the frame matches the other header shot instead of growing to fit a
      // panel that is taller than it is wide.
      anchors: (page) => [
        page.locator('[aria-label="Icon for Atlas"]'),
        page.getByPlaceholder("Search icons"),
      ],
      width: HEADER_SHOT_WIDTH,
    },
  },
  {
    id: "thread-stages",
    plugin: "bb-plugin-thread-stages",
    outputs: THEME_FILES,
    outputFor: themedOutput,
    async prepare({ page }) {
      await openFeaturedThread(page);
    },
    // The plugin owns the whole thread list rather than one control inside it,
    // so the shade lifts its entire sidebar out of the window.
    highlights: (page) => [
      { locator: page.locator("[data-thread-stages-sidebar-root]"), padding: 6 },
    ],
    crop: {
      anchors: (page) => [page.locator("[data-thread-stages-sidebar-root]")],
      padding: 24,
    },
  },
  {
    id: "missing-keyboard-shortcuts",
    plugin: "bb-plugin-missing-keyboard-shortcuts",
    outputs: THEME_FILES,
    outputFor: themedOutput,
    async prepare({ page }) {
      await openFeaturedThread(page);
      // ⇧⌘L opens a side chat and puts the cursor in its composer, so the
      // question can be typed without clicking anything.
      await page.keyboard.press("Shift+Meta+KeyL");
      await page.getByRole("textbox", { name: "Reply…" }).waitFor();
      await page.waitForTimeout(800);
      await page.keyboard.type(SIDE_CHAT_QUESTION);
      await page.keyboard.press("Enter");
      await page.getByText("Eighteen dashboard tests cover them.").waitFor();
      await page.waitForTimeout(800);
    },
    highlights: (page) => [
      {
        locator: sideChatPanel(page),
        // The panel runs the full height of the window, so the keys sit beside
        // it rather than under it.
        keys: "⇧ ⌘ L",
        keysPlacement: "left",
      },
    ],
    crop: { anchors: (page) => [sideChatPanel(page)], padding: 20 },
  },
  {
    id: "chatgpt-theme",
    plugin: "bb-plugin-chatgpt-theme",
    outputs: ["screenshot-light.png", "screenshot-dark.png", "screenshot.png"],
    outputFor: themedOutput,
    // The two palettes meet along the diagonal in one image for the README.
    split: "screenshot.png",
    // The palette is server state, so it is switched on for this shot only and
    // switched back after it, leaving every other shot on bb's own default.
    setup({ fixture }) {
      fixture.run(["theme", "set", "plugin:chatgpt-theme:chatgpt"]);
    },
    teardown({ fixture }) {
      fixture.run(["theme", "reset"]);
    },
    async prepare({ page }) {
      await openFeaturedThread(page);
    },
    // A palette has nothing to point at: the whole window is the change.
    highlights: () => [],
    crop: { anchors: (page) => [page.locator("body")], padding: 0 },
  },
];
