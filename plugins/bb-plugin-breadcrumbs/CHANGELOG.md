# bb-plugin-project-breadcrumbs

## 0.3.0

### Minor Changes

- 14f160a: Rename Project icons to Icons and Project breadcrumbs to Breadcrumbs, ahead of
  both widening past projects to bb's thread sections.
  
  bb takes a plugin's id from its package name and namespaces routes, storage,
  settings, and CLI commands by it, so each renamed plugin installs as a new one
  and starts on an empty database. Neither is published to the BB Community
  marketplace, so nothing carries over: reinstall as `icons` and `breadcrumbs`,
  remove `project-icons` and `project-breadcrumbs`, and pick the project icons
  again.
  
  Thread stages reads these icons over the neighbouring plugin's id and hears
  edits on a shared broadcast channel; both move with the rename, to `icons` and
  `bb.icons`. The DOM markers each plugin leaves in bb's thread header follow:
  `data-icons-root` and `data-breadcrumbs-root`.

### Patch Changes

- 31d676c: Reword the plugin description so bb, the marketplace listing, npm, and the
  repository README all show the same sentence.

## 0.2.1

### Patch Changes

- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 78345a9: Drop vendored components no entry point reaches, and point the shadcn
  registry at the bb release this plugin targets.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.2.0

### Minor Changes

- e9ead62: Ship each plugin's own Hugeicons branding icon: Shapes01 for Project icons, Command for Missing keyboard shortcuts, ChatGPT for ChatGPT theme, and a folder holding ArrowRight01 for Project breadcrumbs.
- a0bae2c: Rename Project header breadcrumb to Project breadcrumbs, matching the plural naming the other plugins use for what they add, and rename its DOM marker to `data-project-breadcrumbs-root`.

## 0.1.0

### Minor Changes

- Initial release: the current project and its actions menu in bb thread headers.
