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

After the package is published to npm:

```sh
bb plugin install npm:bb-plugin-thread-tasks@0.5.0 --yes
```

Then select **Thread tasks** in **Settings → Appearance → Sidebar**. Update an
installed copy with `bb plugin update thread-tasks`.

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
npm install
npm run release:check
bb plugin install . --yes
bb plugin reload thread-tasks
```

`release:check` runs the tests and typecheck, rebuilds from a clean `dist/`,
fails if the generated files differ from Git, and installs the packed npm
artifact in a temporary directory to validate its contents.

## License

[MIT](LICENSE)
