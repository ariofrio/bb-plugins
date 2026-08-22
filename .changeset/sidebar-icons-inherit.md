---
"bb-plugin-icons": patch
"bb-plugin-thread-stages": patch
---

Let an uncolored sidebar icon take the color of the label beside it. Both
plugins pinned a token instead — `text-subtle-foreground` on bb's group
headers, `text-muted-foreground/70` on a stage row — and neither token moves
when a theme moves its ink. The icon came out brighter than its label in the
default theme and darker in the ChatGPT one, from the same two lines. Inheriting
matches bb's own pairing of an icon with its label, in any theme.
