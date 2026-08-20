---
"bb-plugin-icons": minor
---

Draw the icon in bb's own sidebar, on every project and section header.

The icon sits at the head of the group's label row, where Thread stages puts a
stage icon, which is what lines the group name up with the New thread,
Extensions, and Automations labels above it. Clicking it opens the same picker
the thread header offers.

bb has no always-mounted React slot and a thread-header action only exists on a
thread route, so this half runs as a content script — outside bb's provider
tree, where no SDK hook reaches, so it talks to its own backend over fetch.
One React tree portals into every header rather than a root per header, because
bb replaces all of them at once when the sidebar's Organize mode changes:
project groups appear under By project and section groups only under Manually.
