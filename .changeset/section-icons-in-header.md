---
"bb-plugin-icons": minor
"bb-plugin-breadcrumbs": minor
---

Show a section's icon in the thread header, beside the crumb it belongs to.

Breadcrumbs leaves an empty marked span before each crumb it draws and Icons
fills it, because bb's SDK gives one plugin no way to render another's component
and the icons have to sit between the crumbs rather than ahead of them. An
unfilled anchor occupies nothing, so either plugin alone reads as it did.

With no crumbs to sit beside — every one turned off, or Breadcrumbs not
installed — the header keeps a single icon, chosen the way a sidebar row chooses:
the project's, or the section's where that project has no icon of its own.

The glyphs bb already draws for a project and for the personal project are no
longer offered in the picker. Choosing one stored a row indistinguishable from
having chosen nothing, which then outranked the section's icon on every thread in
that project — a pick that appeared to change nothing while quietly changing the
sidebar.
