# bb-plugins

Personal plugins for [bb](https://github.com/ymichael/bb).

## Plugins

- [Missing keyboard shortcuts](plugins/missing-keyboard-shortcuts) — adds
  shortcuts for creating and archiving threads, navigating history, focusing
  the primary and secondary composers, and toggling a thread terminal.
- [Project header breadcrumb](plugins/bb-plugin-project-header-breadcrumb) —
  adds the current project and its native actions menu before each thread
  title.
- [Thread tasks](plugins/bb-plugin-thread-tasks) — treats sidebar threads as
  manually ordered tasks in Done, To do, Working, Waiting, Deferred, and
  Canceled groups.

Each plugin is an independently published npm package, installed with
`bb plugin install npm:<package>@<version> --yes`. See a plugin's README for
its package name.

## Releases

Every plugin owns its lockfile, pinned `bb-app` build dependency, `LICENSE`,
`files` allowlist, and `prepublishOnly` hook, so each one builds and publishes
on its own. Two repository scripts enforce the shared release contract:

- `scripts/verify-dist.mjs` rebuilds from a clean `dist/` and fails when the
  committed `dist/` and `types/` differ from that build.
- `scripts/verify-package.mjs` packs the plugin, checks the tarball against the
  files its manifest and build produce, and installs it in a temporary
  directory to validate the installed manifest and build metadata.

Both run from a plugin directory through `npm run release:check`, which
[CI](.github/workflows/plugins.yml) runs for every plugin.

## License

[MIT](LICENSE)
