---
"bb-plugin-icons": patch
---

Open the icon picker without building the whole catalog first.

Every one of the 2,532 icons was rendered on open, putting over fourteen
thousand nodes in the popover where bb's own menus hold about twenty-five. The
cost landed where it shows: the browser built the grid before it could paint,
so the picker was slow to arrive, and its entrance animation ran on a blocked
thread, dropping frames until it snapped into place rather than easing.

Categories are now drawn as they approach the viewport, behind placeholders
sized to the grid they stand in for, so the scrollbar never shifts under the
pointer. First paint is 534 nodes, the picker appears 45ms after the click
instead of 127ms, and the entrance animation runs 133ms of its 150ms.
