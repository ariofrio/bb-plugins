---
"bb-plugin-icons": patch
---

Let the thread header's icon take the color of the header it sits in, the same
way the sidebar's now does. It was pinned to `text-muted-foreground`, which
matched none of bb's header controls — bb draws those at `--foreground` or at
`--subtle-foreground/75`, and the icon sat between the two. Inheriting puts it
at the weight of the thread title beside it, which is where bb's own header
buttons are.
