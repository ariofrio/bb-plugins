---
"bb-plugin-icons": patch
---

Answer bb with the sidebar script's disposer before reading its settings. bb
holds a plugin attributed for as long as `mount` is unresolved, and while any
plugin is attributed it refuses to let a React-owned node into a container React
does not own — so reading first held the whole app in that state for the length
of a round trip, and every plugin drawing into bb's chrome in the meantime was
refused and blamed on this one. The read still happens before a single anchor is
placed; it just happens after bb has its disposer.
