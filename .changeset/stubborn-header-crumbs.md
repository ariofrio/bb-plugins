---
"bb-plugin-breadcrumbs": patch
---

Offer the crumbs again when bb refuses them, so a header stops coming up bare.
bb blocks a React-owned node from entering a container React does not own while
a plugin is attributed on its stack, and it holds a plugin attributed across
`await` — so for as long as another plugin's content script waits on its own
backend, the crumbs were dropped without a word and never offered again. About
one thread header in three opened with nothing before its title.
