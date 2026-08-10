# Missing keyboard shortcuts

Adds keyboard shortcuts that BB does not currently provide:

- `Command-[` navigates backward in browser history.
- `Command-]` navigates forward in browser history.
- `Command-N` starts a new thread with no project selected.
- `Command-Shift-N` starts a new thread in the selected thread's project, or
  the last selected thread's project when no thread is selected.
- `Command-L` focuses the primary composer.
- `Command-Shift-L` activates a side chat in the current thread. It creates one
  only when none exists; otherwise it selects the active or most recently used
  side chat, opens the right sidebar, and focuses its secondary composer. When
  that composer is already selected, visible, and focused, the shortcut closes
  the right sidebar and focuses the primary composer.
- Control-backtick activates a terminal in the current thread. It creates one
  only when none exists; otherwise it selects the most recently used terminal,
  opens the right sidebar, and focuses it. When that terminal is already
  selected, visible, and focused, the shortcut closes the right sidebar and
  focuses the primary composer.

All shortcuts work while an input, editor, or composer has focus. They use
exact modifier matching, ignore held-key repeats, and stop matched key events
from propagating to downstream BB or editor handlers.

The same-project shortcut remembers the last selected thread's project in the
client. Before any thread has been selected, it falls back to no project.

The terminal shortcut is only claimed on a thread route. Terminal focus
recency is remembered per client and per thread; terminal input time provides
the fallback ordering when the client has not focused one yet.

## Install

After the package is published to npm:

```sh
bb plugin install npm:bb-plugin-missing-keyboard-shortcuts@0.1.0 --yes
```

Update an installed copy with `bb plugin update missing-keyboard-shortcuts`.

## Development

```sh
npm install
npm run release:check
bb plugin install . --yes
bb plugin reload missing-keyboard-shortcuts
```

`release:check` runs the tests and typecheck, rebuilds from a clean `dist/`,
fails if the generated files differ from Git, and installs the packed npm
artifact in a temporary directory to validate its contents.

## License

[MIT](LICENSE)
