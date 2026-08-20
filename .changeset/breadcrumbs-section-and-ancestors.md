---
"bb-plugin-breadcrumbs": minor
---

Show the thread's section and the threads it came from, each switchable on its
own.

The section crumb opens the menu bb's own sidebar section header opens —
Rename and Remove, with bb's wording for both — backed by bb's section SDK.
Ancestor crumbs walk from the thread to its root, so a fork or a side chat
reads `Section > Project > Parent > This thread`, and each one opens that
thread.

The section is resolved on the backend from a thread id rather than read from
the sidebar's live view, because that view hydrates a thread's `sectionId`
separately from the thread itself and bb publishes no event when a section
changes.
