# bb-plugin-chatgpt-theme

## 0.2.1

### Patch Changes

- 4e0d644: Move each plugin's TypeScript sources under `src/`, leaving only packaging and
  tooling configuration in the plugin root. Published tarballs now ship `src/`
  without its co-located tests.
- 4e0d644: Follow the surrounding color scheme in each plugin's icon, so the marketplace's Browse screen stops painting it a fixed grey.

## 0.2.0

### Minor Changes

- 4b5b235: Rename Codex theme to ChatGPT theme, following OpenAI's rename of the desktop app it matches, and rename its theme to `chatgpt`.
- e9ead62: Ship each plugin's own Hugeicons branding icon: Shapes01 for Project icons, Command for Missing keyboard shortcuts, ChatGPT for ChatGPT theme, and a folder holding ArrowRight01 for Project breadcrumbs.

## 0.1.0

### Minor Changes

- Initial release: a light-and-dark bb theme that matches the OpenAI ChatGPT desktop palette.
