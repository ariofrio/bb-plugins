# Thread Status

A bb sidebar plugin that groups threads into six manual statuses:

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

The sidebar remains opt-in after installation. Select **Thread Status** under
**Settings → Appearance → Sidebar**.

## CLI

```sh
bb thread-status get <thread-id> [--json]
bb thread-status set <thread-id> <status> [--json]
bb thread-status list [--status <status>] [--json]
bb thread-status reorder <thread-id> [--after <id>] [--before <id>] [--json]
```

Status input is case-insensitive and accepts compact spellings such as `todo`,
`to-do`, and `cancelled`. `get` reports `To Do (default)` when the thread has
not been organized explicitly. `list` includes explicit assignments only.
`reorder` follows the core pinned-thread interface: pass the immediately
preceding thread with `--after`, the immediately following thread with
`--before`, or omit one at a group boundary. Change status separately with
`set`; a changed status is inserted at the front of its destination group.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```

After editing an installed copy, run `bb plugin reload thread-status`.
