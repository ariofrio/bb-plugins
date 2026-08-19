# Thread stages

A bb sidebar that organizes root threads into stages. It preserves
bb's pinned-thread and subthread behavior, then groups the remaining root
threads into manually ordered **Backlog**, **To do**, **Working**, **Blocked**,
**Done**, and **Canceled** sections.

Child threads do not have stages or positions of their own. They
always render beneath their parent, inherit the root parent's stage, and move
with that parent. Their thread actions therefore omit stage controls.

Each row shows its project's icon when the [Project
icons](../bb-plugin-project-icons#readme) plugin is installed, so a
stage-grouped list still tells you what a thread belongs to. Without that
plugin the rows look as they always have.

Use **Projects and sections** above the stages to focus the whole
sidebar—including pinned and search results—on one project or one native
thread section. The selection is stored only in the current browser and does
not change stage assignments or synchronization. The adjacent actions create a
project through bb's native host folder picker or open the New section dialog.
Stage counts show the number of filtered root threads in each unpinned stage;
they are enabled by default and can be hidden in the plugin's settings.

Drag root threads to reorder or change their stage. Ordering uses
fractional keys, so a move updates only the moved thread. Root threads enter
**Working** when they start and return to **To do** when they stop, unless you
manually move them after the transition. A thread blocked on a question or an
approval counts as **To do** while it waits, because the next move is yours.

## Install

Install it from this repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin thread-stages
```

Then select **Thread stages** in **Settings → Appearance → Sidebar**.

Update an installed copy with:

```sh
bb plugin update thread-stages
```

## Keyboard shortcuts

On a thread route, `.` chords set the open thread's stage and move you
on:

| Shortcut | Stage       | Then                           |
| -------: | ----------- | ------------------------------ |
|       ⌘. | Done        | Go to the thread below it      |
|      ⇧⌘. | To do       | Stay, or undo your last filing |
|     ⌃⇧⌘. | Blocked     | Go to the thread below it      |
|      ⌃⌘. | Backlog     | Go to the thread below it      |
|      ⌥⌘. | Canceled    | Go to the thread below it      |

**Working** has no chord because Thread stages assigns it automatically.
Moving a thread to **Done** does not archive it.

Filing a thread moves you down the To do stage, so the chords walk it in
place: you land on the row below the one you filed, or on the row above it
when you file the last one. Filing a thread that was not in To do starts you at
the top instead. Pinned threads are skipped, and when To do empties you land on
a composer with no project selected.

**⇧⌘.** brings the open thread back to To do and leaves you there. When it is
*already* To do, the shortcut undoes instead: the thread you filed most recently
returns to To do, in the position it held, and you go to it. Press again to
walk further back, like reopening closed tabs. Only moves you made in bb count
as yours, so a thread an agent filed itself stays filed.

Arrow chords move the open root thread:

|    Shortcut | Move                               |
| ----------: | ---------------------------------- |
|   ⌥⌘↑ / ⌥⌘↓ | One position within its stage     |
| ⌥⇧⌘↑ / ⌥⇧⌘↓ | To the top or bottom of its stage |
|   ⌃⌘↑ / ⌃⌘↓ | To the stage above or below       |

A move that would leave a thread where it already is does nothing, and moving
to another stage appends it there. Reordering moves root threads
while keeping their entire child-thread hierarchy attached, and reorders a
pinned root thread within the pinned section. The backend resolves each move
and rejects stage shortcuts on child threads, whichever sidebar is displayed.

All of these shortcuts work while an input, editor, or composer has focus. They
use exact modifier matching, ignore held-key repeats, and stop matched key
events from propagating to downstream BB or editor handlers.

## CLI

```sh
bb thread-stages list [--stage <stage>] [--json]
bb thread-stages show [<thread-id> | --self] [--json]
bb thread-stages update [<thread-id> | --self] [--stage <stage>] [--after <thread-id>] [--before <thread-id>] [--json]
```

Stage input is case-insensitive. `update` without `--after` or `--before`
places a thread at the bottom only when its stage changes; repeating its
current stage is a no-op. A neighbor outside the destination stage is ignored with a
warning.

Child thread IDs are rejected because their stage belongs to the root
thread.

## Development

```sh
npm run release:check
bb plugin reload thread-stages
npm run qa:project-filter-hover
```

`release:check` runs the tests and typecheck, checks the committed SDK
declarations are current, builds, and installs the packed npm artifact in a
temporary directory to validate its contents. `dist/` is built, never
committed. The package is not published to npm yet, but it stays publishable
so it can be.

`qa:project-filter-hover` opens an isolated browser against `BB_SERVER_URL` and
fails if a sticky stage shield covers the thread filter's rounded bottom edge
or an empty project filter loses the sidebar's horizontal inset.

## License

[MIT](LICENSE)
