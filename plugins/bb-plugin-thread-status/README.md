# Thread Tasks

A bb sidebar plugin that treats threads as tasks, grouped into six manual task
statuses:

- Done
- To Do
- Working
- Waiting
- Deferred
- Canceled

Drag a row by its handle to reorder it or move it into another group. Each row
also exposes keyboard-friendly move buttons and a task-status selector. Threads
with no saved task status appear in **To Do**.

Order is stored as a base-62 fractional lexicographic key, using the same
strategy as `bb thread reorder-pinned`. A move names only its adjacent threads
and updates only the moved row inside an immediate SQLite transaction. This
avoids renumbering a whole task-status group and reduces conflicts between
concurrent moves.

The sidebar remains opt-in after installation. Select **Tasks** under
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
