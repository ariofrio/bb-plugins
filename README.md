# bb-plugins

Personal plugins for [bb](https://github.com/ymichael/bb).

## Plugins

- [Missing keyboard shortcuts](plugins/bb-plugin-missing-keyboard-shortcuts#readme) —
  adds shortcuts for starting threads, navigating history, focusing the
  primary composer, and toggling a side chat or thread terminal.
- [Project header breadcrumb](plugins/bb-plugin-project-header-breadcrumb#readme)
  — adds the current project and its native actions menu before each thread
  title.
- [Project icons](plugins/bb-plugin-project-icons#readme) — gives each project
  an icon and optional color, shown next to its name in the thread header.
- [Thread tasks](plugins/bb-plugin-thread-tasks#readme) — treats sidebar
  threads as manually ordered tasks in Backlog, To do, Working, Waiting,
  Done, and Canceled groups.

## Install

Clone the repository and install every plugin at once:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins
npm run install:plugins
```

Run the same command after a `git pull`: it installs whatever is missing, then
rebuilds and reloads every plugin. To install one plugin on its own, follow its
README.

`bb plugin install git:...` installs the plugin at a repository root, so it
cannot reach these plugins until bb supports multi-plugin repositories
([get-bb/bb#1097](https://github.com/get-bb/bb/issues/1097)). Nothing here is
published to npm yet either.

## Releases

Every plugin owns its lockfile, pinned `bb-app` build dependency, `LICENSE`,
`files` allowlist, and `prepublishOnly` hook, so each one builds and packages
on its own and stays ready to publish. Two repository scripts enforce the
shared release contract:

- `scripts/verify-types.mjs` fails when a plugin's committed SDK declarations
  are stale or edited. `bb plugin build` never rewrites `types/`, so nothing
  else catches it.
- `scripts/verify-package.mjs` packs the plugin, checks the tarball against the
  files its manifest and build produce, and installs it in a temporary
  directory to validate the installed manifest and build metadata.

Both run from a plugin directory through `npm run release:check`, which builds
before packing and which [CI](.github/workflows/plugins.yml) runs for every
plugin. The root `package.json` carries no dependencies; it only holds
`install:plugins`, which discovers plugin directories the same way CI does.

`dist/` is generated, not committed: every way of installing a plugin builds
it. A path install compiles the app bundle and runs the server from source, a
git install compiles both, and `prepublishOnly` builds before `npm publish`
packs the `files` allowlist.

## License

[MIT](LICENSE)
