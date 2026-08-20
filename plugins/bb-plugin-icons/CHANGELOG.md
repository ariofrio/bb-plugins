# bb-plugin-project-icons

## 0.2.1

### Patch Changes

- a63f22b: Add `npm run check:catalog`, which derives the icon catalog from Hugeicons'
  index again and reports the icons whose tags or category moved without writing
  anything, so upstream rewrites can be read before they are adopted. Adopt
  upstream's current tags for the five icons it has rewritten since the catalog
  was first generated.
- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 78345a9: Drop vendored components no entry point reaches, and point the shadcn
  registry at the bb release this plugin targets.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.2.0

### Minor Changes

- e9ead62: Ship each plugin's own Hugeicons branding icon: Shapes01 for Project icons, Command for Missing keyboard shortcuts, ChatGPT for ChatGPT theme, and a folder holding ArrowRight01 for Project breadcrumbs.

### Patch Changes

- a0bae2c: Follow the Project breadcrumbs rename when locating the breadcrumb root in the thread header.

## 0.1.2

### Patch Changes

- 548b490: Use bb's hand cursor and standard 28px control size for the project icon trigger and selector buttons, with a full-width, evenly spaced icon grid.

## 0.1.1

### Patch Changes

- 728ffc9: Replace the project icon dialog with a compact popover that groups searchable icons by category, keeps filtered category navigation visible, and improves color, reset, scrolling, and search controls.

## 0.1.0

### Minor Changes

- Initial release: an icon and optional color for each bb project.
