# Thread tasks

A bb sidebar that treats root threads as tasks. It preserves bb's pinned-thread
and subthread behavior, then groups the remaining root threads into manually
ordered **Backlog**, **To do**, **Working**, **Blocked**, **Done**, and
**Canceled** sections.

Child threads do not have task statuses or positions of their own. They always
render beneath their parent, inherit the root parent's section, and move with
that parent. Their thread actions therefore omit task-status controls.

Each row shows its project's icon when the [Project
icons](../bb-plugin-project-icons#readme) plugin is installed, so a
status-grouped list still tells you what a thread belongs to. Without that
plugin the rows look as they always have.

Drag tasks to reorder or change their task status. Task order uses fractional
keys, so a move updates only the moved task. Root threads automatically enter
**Working** when they start and return to **To do** when they stop, unless you
manually move them after the transition. A thread blocked on a question or an
approval counts as **To do** while it waits, because the next move is yours.

## Install

Install it from this repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin thread-tasks
```

Then select **Thread tasks** in **Settings → Appearance → Sidebar**.

Update an installed copy with:

```sh
bb plugin update thread-tasks
```

## Keyboard shortcuts

On a thread route, `.` chords set the open thread's task status and move you
on:

| Shortcut | Task status | Then                           |
| -------: | ----------- | ------------------------------ |
|       ⌘. | Done        | Go to the task below it        |
|      ⇧⌘. | To do       | Stay, or undo your last filing |
|     ⌃⇧⌘. | Blocked     | Go to the task below it        |
|      ⌃⌘. | Backlog     | Go to the task below it        |
|      ⌥⌘. | Canceled    | Go to the task below it        |

**Working** has no chord because the task workflow assigns it automatically.
Marking a task **Done** does not archive its thread.

Filing a task moves you down the To do section, so the chords walk it in
place: you land on the row below the one you filed, or on the row above it
when you file the last one. Filing a task that was not in To do starts you at
the top instead. Pinned threads are skipped, and when To do empties you land on
a composer with no project selected.

**⇧⌘.** brings the open task back to To do and leaves you there. When the open
task is *already* To do it undoes instead: the task you filed most recently
returns to To do, in the position it held, and you go to it. Press again to
walk further back, like reopening closed tabs. Only moves you made in bb count
as yours, so a thread an agent filed itself stays filed.

Arrow chords move the open thread's task:

|    Shortcut | Move                               |
| ----------: | ---------------------------------- |
|   ⌥⌘↑ / ⌥⌘↓ | One position within its status     |
| ⌥⇧⌘↑ / ⌥⇧⌘↓ | To the top or bottom of its status |
|   ⌃⌘↑ / ⌃⌘↓ | To the status above or below       |

A move that would leave a task where it already is does nothing, and moving to
another status appends the task to that section. Reordering moves root tasks
while keeping their entire child-thread hierarchy attached, and reorders a
pinned root thread within the pinned section. The backend resolves each move
and rejects task shortcuts on child threads, whichever sidebar is displayed.

All of these shortcuts work while an input, editor, or composer has focus. They
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

Child thread IDs are rejected because their task status belongs to the root
parent task.

## Development

```sh
npm run release:check
bb plugin reload thread-tasks
```

`release:check` runs the tests and typecheck, checks the committed SDK
declarations are current, builds, and installs the packed npm artifact in a
temporary directory to validate its contents. `dist/` is built, never
committed. The package is not published to npm yet, but it stays publishable
so it can be.

## License

[MIT](LICENSE)
