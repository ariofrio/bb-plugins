# bb-plugin-thread-stages

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
