---
"bb-plugin-project-icons": patch
---

Add `npm run check:catalog`, which derives the icon catalog from Hugeicons'
index again and reports the icons whose tags or category moved without writing
anything, so upstream rewrites can be read before they are adopted. Adopt
upstream's current tags for the five icons it has rewritten since the catalog
was first generated.
