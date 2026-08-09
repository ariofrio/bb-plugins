# Missing keyboard shortcuts

Adds keyboard shortcuts that BB does not currently provide:

- `Command-[` navigates backward in browser history.
- `Command-]` navigates forward in browser history.
- `Command-N` starts a new thread with no project selected.
- `Command-Shift-N` starts a new thread in the selected thread's project, or
  the last selected thread's project when no thread is selected.
- `Command-Shift-A` archives the current thread and its child threads.

All shortcuts work while an input, editor, or composer has focus. They use
exact modifier matching, ignore held-key repeats, and stop matched key events
from propagating to downstream BB or editor handlers.

The same-project shortcut remembers the last selected thread's project in the
client. Before any thread has been selected, it falls back to no project. The
archive shortcut is only claimed on a thread route. Duplicate archive requests
are ignored while one is in flight, and BB shows success or failure feedback
when it finishes.

## Install

From this directory:

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```
