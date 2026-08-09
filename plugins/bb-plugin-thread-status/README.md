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

The sidebar remains opt-in after installation. Select **Thread Status** under
**Settings → Appearance → Sidebar**.

## CLI

```sh
bb thread-status get <thread-id> [--json]
bb thread-status set <thread-id> <status> [--json]
bb thread-status list [--status <status>] [--json]
```

Status input is case-insensitive and accepts compact spellings such as `todo`,
`to-do`, and `cancelled`. `get` reports `To Do (default)` when the thread has
not been organized explicitly. `list` includes explicit assignments only.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install . --yes
```

After editing an installed copy, run `bb plugin reload thread-status`.
