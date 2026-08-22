---
"bb-plugin-thread-stages": minor
---

Fall back to a thread's section icon on its sidebar row. The row still draws its
project's icon first — that is what it always drew — but a project nobody has
picked an icon for now defers to the section the thread is filed under, and only
falls back to the project's default glyph when neither was picked. A child thread
follows its root's section, the rule bb itself uses.
