---
"bb-plugin-chatgpt-theme": patch
"bb-plugin-missing-keyboard-shortcuts": patch
"bb-plugin-project-breadcrumbs": patch
"bb-plugin-project-icons": patch
"bb-plugin-thread-stages": patch
---

Move each plugin's TypeScript sources under `src/`, leaving only packaging and
tooling configuration in the plugin root. Published tarballs now ship `src/`
without its co-located tests.
