---
"bb-plugin-icons": patch
---

Draw the icon catalog a row at a time rather than a category at a time.

A category holds its true height whether or not its rows exist, so the
scrollbar describes the whole catalog and never shifts under the pointer.
Browsing the entire catalog now leaves 188 buttons in the popover rather than
1,116 and climbing, and the scroll height holds steady where it used to move by
several hundred pixels as categories materialised.

Rows are measured from `offsetTop` and `scrollTop` rather than bounding rects:
thirty-two categories each asking for a rect forces the browser to lay the
scroller out again, dozens of times, in the frame the popover is trying to
appear in. The picker's entrance now runs 132–152ms of its 150ms, against
117–144ms for bb's own menus.
