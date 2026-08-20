---
"bb-plugin-breadcrumbs": minor
"bb-plugin-icons": minor
"bb-plugin-thread-stages": patch
---

Rename Project icons to Icons and Project breadcrumbs to Breadcrumbs, ahead of
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
