# Thread Tasks

A bb sidebar plugin that treats threads as tasks, grouped into six manual task
statuses:

- Done
- To Do
- Working
- Waiting
- Deferred
- Canceled

Drag a row to reorder it or move it into another group. The row otherwise
follows bb's built-in sidebar: live thread and split indicators occupy the
trailing slot, then yield to the standard hover menu; right-click opens the
same actions. That menu includes keyboard-accessible move commands and a
**Task status** submenu alongside bb's open-in-split, read, pin, rename,
archive, and delete actions. Threads with no saved task status appear in
**To Do**.

Subthreads nest under their parent when both are in the same task-status group.
If a parent and child have different task statuses, each appears as a root in
its own group; moving a task never silently changes its descendants. Collapsed
task-status groups and collapsed parent threads are remembered in this client.
Because this is a cross-project task view, each row also shows its project.

Order is stored as a base-62 fractional lexicographic key, using the same
strategy as `bb thread reorder-pinned`. A move names only its adjacent threads
and updates only the moved row inside an immediate SQLite transaction. This
avoids renumbering a whole task-status group and reduces conflicts between
concurrent moves.

The sidebar remains opt-in after installation. Select **Thread Tasks** under
**Settings → Appearance → Sidebar**.

## CLI

```sh
bb task list [--status <status>] [--json]
bb task show [<id> | --self] [--json]
bb task update [<id> | --self] [--status <status>] [--after <id>] [--before <id>] [--json]
```

The interface follows bb's entity commands: `list`, `show`, and `update`.
Task-status input is case-insensitive and accepts compact spellings such as
`todo`, `to-do`, and `cancelled`. `show` reports `To Do (default)` when the
thread has not been organized explicitly. `list` includes visible,
non-archived threads and materializes missing ones as To Do tasks in their
existing order. Its output is grouped in canonical task-status order, then
arranged by each task's fractional order within the group; the internal order
keys are not displayed.

`update` changes task status, position, or both. A task-status change without a
position flag puts the task at the bottom of its destination group. Override
that placement with the immediately preceding task in `--after`, the
immediately following task in `--before`, or both. Without `--status`, those
flags reorder the task within its current group. A neighbor outside the
destination task-status group is ignored with a warning. `--self` resolves to
the current bb thread. Task IDs are thread IDs; machine-readable results expose
them through the standard `id` field and name the organization field
`taskStatus`, keeping it distinct from a thread's lifecycle `status` (idle,
active, and so on).

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```

After editing an installed copy, run `bb plugin reload thread-status`.
