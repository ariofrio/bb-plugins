---
"bb-plugin-breadcrumbs": patch
"bb-plugin-icons": patch
---

Let the icon and the crumbs share bb's thread header.

Both plugins put a node of their own at the head of that header, and both
looked for bb's title at `center.firstElementChild` — so whichever arrived
first became that child and the other found a sibling plugin's node with no
title in it and gave up. The title is now found by what it holds, skipping
anything marked as a plugin's root, which makes it independent of who arrives
first.

The crumbs also render in a React root of their own, scheduled on an animation
frame. bb refuses to put a React-owned node under a container React does not
own while any plugin is attributed on its stack, and it keeps that attribution
across `setTimeout` and `queueMicrotask`; `requestAnimationFrame` is left
native, so a frame callback runs unattributed.
