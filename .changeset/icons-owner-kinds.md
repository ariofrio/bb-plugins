---
"bb-plugin-icons": minor
"bb-plugin-thread-stages": patch
---

Let a bb thread section hold an icon the way a project does.

Icons are now keyed by an owner kind and an id rather than a project id, so the
two never collide, and the RPC contract follows: `listIcons`, `setIcon`, and
`clearIcon` in place of their project-only spellings. Existing choices migrate
across untouched.

Sections default to bb's own section mark. Projects default to a folder and the
personal project to a chat bubble because bb draws them that way itself, and a
section has the same claim — but Hugeicons has no matching glyph, which is why
Thread stages already composes its own SectionAdd. This is that mark without
the plus.

bb publishes no event when a section is created, renamed, or removed, so an
icon whose section is gone can only be found by comparing against the live
list. The cleanup service sweeps on start and after each write, which keeps the
read path free of a round-trip it would otherwise pay on every header mount.
