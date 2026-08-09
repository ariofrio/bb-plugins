# Thread Tasks

A bb sidebar plugin that treats threads as tasks, grouped into six manual
statuses:

- Done
- To Do
- Working
- Waiting
- Deferred
- Canceled

Drag a row by its handle to reorder it or move it into another group. Each row
also exposes keyboard-friendly move buttons and a status selector. Threads with
no saved status appear in **To Do**.

Order is stored as a base-62 fractional lexicographic key, using the same
strategy as `bb thread reorder-pinned`. A move names only its adjacent threads
and updates only the moved row inside an immediate SQLite transaction. This
avoids renumbering a whole status group and reduces conflicts between concurrent
moves.

The sidebar remains opt-in after installation. Select **Tasks** under
**Settings → Appearance → Sidebar**.

## CLI

```sh
bb task list [--status <status>] [--json]
bb task show [<id> | --self] [--json]
bb task update [<id> | --self] --status <status> [--json]
bb task reorder <id> [--after <id>] [--before <id>] [--json]
```

The interface follows bb's entity commands: `list`, `show`, `update`, and
`reorder`. Status input is case-insensitive and accepts compact spellings such
as `todo`, `to-do`, and `cancelled`. `show` reports `To Do (default)` when the
thread has not been organized explicitly. `list` includes visible, non-archived
threads and materializes missing ones as To Do tasks in their existing order.
`reorder` follows the core pinned-thread interface: pass the immediately
preceding thread with `--after`, the immediately following thread with
`--before`, or omit one at a group boundary. Change status separately with
`update --status`; a changed status is inserted at the front of its destination
group. `--self` resolves to the current bb thread. Task IDs are thread IDs;
machine-readable results expose them through the standard `id` field.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```

After editing an installed copy, run `bb plugin reload thread-status`.
