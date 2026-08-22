---
"bb-plugin-icons": minor
"bb-plugin-breadcrumbs": minor
---

Show a section's icon in the thread header, beside the crumb it belongs to.

Breadcrumbs leaves an empty marked span before each crumb it draws and Icons
fills it, because bb's SDK gives one plugin no way to render another's
component and the icons have to sit between the crumbs rather than ahead of
them. An unfilled anchor occupies nothing, so either plugin alone reads as it
did.

With no crumbs to sit beside — every one turned off, or Breadcrumbs not
installed — the header keeps a single icon, chosen the way a sidebar row
chooses: the section's where the section has one, the project's where it does
not.
