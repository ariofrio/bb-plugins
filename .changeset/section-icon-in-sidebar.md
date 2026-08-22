---
"bb-plugin-thread-stages": minor
---

Draw a thread's section icon on its sidebar row, falling back to its project's.
A section only carries an icon once someone picks one — the Icons plugin writes
the row on the first pick and deletes it on Remove — so a sidebar nobody has
touched looks exactly as it did. A child thread follows its root's section, the
rule bb itself uses.
