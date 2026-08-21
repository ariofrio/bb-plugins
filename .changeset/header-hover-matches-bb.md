---
"bb-plugin-breadcrumbs": patch
"bb-plugin-chatgpt-theme": patch
"bb-plugin-icons": patch
---

Give every control this repo adds to bb's thread header the hover bb's own
controls use: the fill snaps in and eases out, and an open menu holds the
active fill.

The ChatGPT theme also stops reaching into what plugins draw. One rule matched
icon-only buttons by shape — `size-7` and `text-muted-foreground` — rather than
by where they are, which caught the icon this repo adds to the header and gave
it a dimmer fill than the button beside it, with a colour that never lifted on
hover. It now skips anything inside a plugin's own root.
