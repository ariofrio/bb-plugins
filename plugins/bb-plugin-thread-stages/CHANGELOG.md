# bb-plugin-thread-stages

## 0.6.2

### Patch Changes

- 31d676c: Reword the plugin description so bb, the marketplace listing, npm, and the
  repository README all show the same sentence.
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

## 0.6.1

### Patch Changes

- bc4b68c: Add Move to section actions, project and section sidebar filtering with native creation controls, stage-count visibility in plugin settings, a native-style section creation dialog, and a theme-aware progress branding icon.
- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.6.0

### Minor Changes

- 32a4ddb: Rename Thread workflow to Thread stages and polish its project filter, stage headers, counts, spacing, hover behavior, and command labels to match BB's built-in sidebar.

## 0.5.0

### Minor Changes

- First tagged release, as Thread workflow: organizes bb root threads into manually ordered workflow stages.
