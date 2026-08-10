# Thread tasks

A bb sidebar that treats threads as tasks. It preserves bb's pinned-thread and
subthread behavior, then groups the remaining threads into manually ordered
**Done**, **To do**, **Working**, **Waiting**, **Deferred**, and **Canceled**
sections.

Drag tasks to reorder or change their task status. Task order uses fractional
keys, so a move updates only the moved task. Threads automatically enter
**Working** when they start and return to **To do** when they stop, unless you
manually move them after the transition.

## Install

Clone the repository and install this directory:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins/plugins/bb-plugin-thread-tasks
npm install
bb plugin install . --yes
```

Then select **Thread tasks** in **Settings → Appearance → Sidebar**.

A direct `bb plugin install git:...` reads the plugin from the repository root,
so it cannot reach a plugin that lives in a subdirectory
([get-bb/bb#1097](https://github.com/get-bb/bb/issues/1097) tracks multi-plugin
repositories). Update an installed copy with:

```sh
git pull
npm install
npm run build
bb plugin reload thread-tasks
```

## Keyboard shortcuts

On a thread route, `.` chords set the current thread's task status:

| Shortcut               | Task status |
| ---------------------- | ----------- |
| `Command-.`            | Done        |
| `Command-Shift-.`      | To do       |
| `Control-Command-.`    | Deferred    |
| `Control-Shift-Command-.` | Waiting  |
| `Option-Command-.`     | Canceled    |

**Working** has no shortcut because the task workflow assigns it automatically.
Marking a task **Done** does not archive its thread.

Arrow chords move the current task within the sidebar:

| Shortcut                    | Action                                   |
| --------------------------- | ---------------------------------------- |
| `Option-Command-↑` / `↓`    | Move one position within its status       |
| `Option-Shift-Command-↑` / `↓` | Move to the top or bottom of its status |
| `Control-Command-↑` / `↓`   | Move to the status above or below         |

A move that would leave a task where it already is does nothing, and moving to
another status appends the task to that section. Reordering follows the
sidebar's layout: it moves a task among the rows at its own depth, skipping a
neighbor's nested threads, and reorders a pinned thread within the pinned
section. The backend resolves each move, so every shortcut works on the open
thread from anywhere in bb, whichever sidebar is displayed.

All of these shortcuts work while an input, editor, or composer has focus; they
use exact modifier matching, ignore held-key repeats, and stop matched key
events from propagating to downstream BB or editor handlers.

## CLI

```sh
bb task list [--status <status>] [--json]
bb task show [<thread-id> | --self] [--json]
bb task update [<thread-id> | --self] [--status <status>] [--after <thread-id>] [--before <thread-id>] [--json]
```

Task-status input is case-insensitive. `update` without `--after` or `--before`
places a task at the bottom only when its status changes; repeating its current
status is a no-op. A neighbor outside the destination status is ignored with a
warning.

## Development

```sh
npm run release:check
bb plugin reload thread-tasks
```

`release:check` runs the tests and typecheck, rebuilds from a clean `dist/`,
fails if the generated files differ from Git, and installs the packed npm
artifact in a temporary directory to validate its contents. The package is not
published to npm yet, but it stays publishable so it can be.

## License

[MIT](LICENSE)
