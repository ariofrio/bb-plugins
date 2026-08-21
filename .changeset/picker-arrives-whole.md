---
"bb-plugin-icons": patch
---

Open the icon picker whole, instead of letting it fill in afterwards.

The catalog is deliberately not in the bundle, so a cold picker used to appear
and then land its categories and icon grid a beat later — one movement answered
by a second, which bb's own menus never do because their content is fixed. It
is now fetched when the pointer reaches the icon rather than when it is
clicked, so a click that follows a pointer finds it ready. Keyboard focus does
the same.

The category row also animated itself in: a chip carries `transition-colors`,
and the first category was chosen in an effect after mount, so it faded from
unselected to selected once the popover had settled. It is chosen while
rendering now.
