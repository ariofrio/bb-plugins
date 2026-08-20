---
"bb-plugin-icons": minor
---

Let each icon placement be turned off on its own.

**Show in the thread header** and **Show in the sidebar** are both on by
default, so an update never takes an icon away from anyone. The thread header
reads them through `useSettings()`; the sidebar half runs in a content script
where no hook reaches, so it asks the backend over `listPlacements` before it
places a single node — an anchor left in bb's sidebar would space the group
label out even with nothing drawn in it.
