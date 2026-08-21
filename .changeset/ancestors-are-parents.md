---
"bb-plugin-breadcrumbs": patch
---

Say that the trail follows parents, not forks.

The setting and the README both promised "every thread this one was forked or
spawned under", which the trail never did and should not: bb gives a thread
spawned under another a `parentThreadId` and nests it in the sidebar, while a
fork gets a `sourceThreadId` and no parent, and bb shows a fork's origin
elsewhere. Only the wording changes; a test now holds the line.
