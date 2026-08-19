# bb-plugins

Personal plugins for [bb](https://getbb.app).

## Plugins

- [Codex theme](plugins/bb-plugin-codex-theme#readme) — matches bb's palette
  to the OpenAI ChatGPT desktop app in light and dark mode.
- [Missing keyboard shortcuts](plugins/bb-plugin-missing-keyboard-shortcuts#readme) —
  adds shortcuts for starting threads, navigating history, focusing the
  primary composer, and toggling a side chat or thread terminal.
- [Project header breadcrumb](plugins/bb-plugin-project-header-breadcrumb#readme)
  — adds the current project and its native actions menu before each thread
  title.
- [Project icons](plugins/bb-plugin-project-icons#readme) — gives each project
  an icon and optional color, shown next to its name in the thread header.
- [Thread workflow](plugins/bb-plugin-thread-workflow#readme) — organizes sidebar
  threads into manually ordered Backlog, To do, Working, Blocked, Done, and
  Canceled workflow stages.

## Install

Clone the repository and install every plugin at once:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins
npm run install:plugins
```

Run the same command after a `git pull`: it installs whatever is missing, then
rebuilds and reloads every plugin. To install one plugin on its own, follow its
README, or select it from the repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin codex-theme
```

The available collection names are listed in [.bb/plugins.json](.bb/plugins.json).
Nothing here is published to npm yet.

## Releases

User-visible plugin changes carry a Changeset created with `npm run
changeset`. After those changes reach `main`, the Version plugins workflow
opens or updates a release pull request with version, lockfile, and changelog
updates. Merging that pull request runs the affected plugins' full release
checks and creates immutable `<plugin-id>/vX.Y.Z` Git tags. Marketplace ranges
then discover compatible releases without another listing pull request.

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
