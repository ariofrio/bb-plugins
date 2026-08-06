# Missing Native Shortcuts

Adds native-style keyboard shortcuts that BB does not currently provide:

- `Command-[` navigates backward in browser history.
- `Command-]` navigates forward in browser history.
- `Command-Shift-A` archives the current thread and its child threads.

All shortcuts work while an input, editor, or composer has focus. They use
exact modifier matching and ignore held-key repeats. They also cancel BB's
delayed Command-key shortcut-hint timer for the current modifier hold.

The archive shortcut is only claimed on a thread route. Elsewhere, its key
event is left untouched. Duplicate archive requests are ignored while one is
in flight, and BB shows success or failure feedback when it finishes.

## Install

From this directory:

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```
