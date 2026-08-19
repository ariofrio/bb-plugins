import { SIDE_CHAT_QUESTION } from "./fixture.mjs";

// What each plugin's screenshot pictures. Every shot starts from the same
// seeded bb and is captured twice: the whole window, for the plugin's own
// README, and a card cropped to what the plugin adds, for the table in the
// root README. Both carry the same shade and the same cutouts.
const THEME_FILES = [
  "screenshot-light.png",
  "screenshot-dark.png",
  "card-light.png",
  "card-dark.png",
];

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
  },
  {
    id: "project-icons",
    plugin: "bb-plugin-project-icons",
    outputs: THEME_FILES,
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
    // The picker is taller than the card, so the card frames its top: the
    // header icon it belongs to, the colors, and the search field.
    focus: (page) => [
      page.locator('[aria-label="Icon for Atlas"]'),
      page.getByPlaceholder("Search icons"),
    ],
  },
  {
    id: "thread-stages",
    plugin: "bb-plugin-thread-stages",
    outputs: THEME_FILES,
    async prepare({ page }) {
      await openFeaturedThread(page);
    },
    // The plugin owns the whole thread list rather than one control inside it,
    // so the shade lifts its entire sidebar out of the window.
    highlights: (page) => [
      { locator: page.locator("[data-thread-stages-sidebar-root]"), padding: 6 },
    ],
    // The sidebar is taller than the card, so the card frames the stages that
    // hold threads rather than the empty ones.
    focus: (page) => [
      page.getByRole("region", { name: "To do" }),
      page.getByRole("region", { name: "Working" }),
    ],
  },
  {
    id: "missing-keyboard-shortcuts",
    plugin: "bb-plugin-missing-keyboard-shortcuts",
    outputs: THEME_FILES,
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
        // it, level with the conversation rather than with its empty middle.
        keys: "⇧ ⌘ L",
        keysPlacement: "left",
        keysAnchor: "start",
      },
    ],
    // The panel is as wide as the card, so the card frames the exchange at its
    // top and the keys that opened it.
    focus: (page) => [
      page.getByRole("toolbar", { name: "Right panel views" }),
      page.getByText("Eighteen dashboard tests cover them."),
    ],
  },
  {
    id: "chatgpt-theme",
    plugin: "bb-plugin-chatgpt-theme",
    outputs: [
      "screenshot-light.png",
      "screenshot-dark.png",
      "screenshot.png",
      "card.png",
    ],
    // The two palettes meet along the diagonal in one image for the README.
    split: true,
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
    // The card sits on the sidebar, where the palette repaints the most per
    // pixel — surfaces, rows, icons, and the selected thread — and reaches far
    // enough into the thread for the diagonal to divide two surfaces.
    focus: (page) => [page.getByRole("region", { name: "To do" })],
  },
];
