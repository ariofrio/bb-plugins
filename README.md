<h1 align="center"><a href="https://github.com/ariofrio">Andres Riofrio</a>'s bb plugins</h1>

<p align="center"><strong>Plugins for <a href="https://getbb.app">bb</a>, the agent IDE that builds itself</strong></p>

<p align="center">
  <a href="https://getbb.app"><img src="https://img.shields.io/badge/bb-0.39%2B-656D76?style=flat-square" alt="bb 0.39+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ariofrio/bb-plugins?style=flat-square&color=656D76" alt="MIT license"></a>
  <a href="https://github.com/ariofrio/bb-plugins/actions/workflows/plugins.yml"><img src="https://img.shields.io/github/actions/workflow/status/ariofrio/bb-plugins/plugins.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
</p>

<br>

```sh
bb marketplace add git:github.com/ariofrio/bb-plugins
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.png"><img src="assets/hero-light.png" alt="bb with Thread stages, Project icons, and Project breadcrumbs at work"></picture></p>

<a href="plugins/bb-plugin-thread-stages#readme"><picture><source media="(prefers-color-scheme: dark)" srcset="plugins/bb-plugin-thread-stages/assets/card-dark.png"><img src="plugins/bb-plugin-thread-stages/assets/card-light.png" alt="Thread stages grouping the bb sidebar into Backlog, To do, Working, Blocked, and Done" align="right" width="48%"></picture></a>

### <img src="assets/icons/thread-stages.svg" alt="" width="26" align="absmiddle"> &nbsp;Thread stages

Group threads in the sidebar into stages from Backlog to Done, updating as they run.

```sh
bb plugin install thread-stages@ariofrio
```

<a href="plugins/bb-plugin-thread-stages#readme">Read more &rarr;</a>

<br clear="all">

<a href="plugins/bb-plugin-project-icons#readme"><picture><source media="(prefers-color-scheme: dark)" srcset="plugins/bb-plugin-project-icons/assets/card-dark.png"><img src="plugins/bb-plugin-project-icons/assets/card-light.png" alt="The icon picker open on the Storefront project's icon in a bb thread header" align="right" width="48%"></picture></a>

### <img src="assets/icons/project-icons.svg" alt="" width="26" align="absmiddle"> &nbsp;Project icons

Give each project an icon and color.

```sh
bb plugin install project-icons@ariofrio
```

<a href="plugins/bb-plugin-project-icons#readme">Read more &rarr;</a>

<br clear="all">

<a href="plugins/bb-plugin-project-breadcrumbs#readme"><picture><source media="(prefers-color-scheme: dark)" srcset="plugins/bb-plugin-project-breadcrumbs/assets/card-dark.png"><img src="plugins/bb-plugin-project-breadcrumbs/assets/card-light.png" alt="The Storefront project and its actions menu in a bb thread header" align="right" width="48%"></picture></a>

### <img src="assets/icons/project-breadcrumbs.svg" alt="" width="26" align="absmiddle"> &nbsp;Project breadcrumbs

Show and manage a thread's project from its header.

```sh
bb plugin install project-breadcrumbs@ariofrio
```

<a href="plugins/bb-plugin-project-breadcrumbs#readme">Read more &rarr;</a>

<br clear="all">

<a href="plugins/bb-plugin-missing-keyboard-shortcuts#readme"><picture><source media="(prefers-color-scheme: dark)" srcset="plugins/bb-plugin-missing-keyboard-shortcuts/assets/card-dark.png"><img src="plugins/bb-plugin-missing-keyboard-shortcuts/assets/card-light.png" alt="A bb side chat opened with the ⇧⌘L shortcut" align="right" width="48%"></picture></a>

### <img src="assets/icons/missing-keyboard-shortcuts.svg" alt="" width="26" align="absmiddle"> &nbsp;Missing keyboard shortcuts

Add shortcuts to start personal or project threads, navigate history, and reach the composer or panel tabs.

```sh
bb plugin install missing-keyboard-shortcuts@ariofrio
```

<a href="plugins/bb-plugin-missing-keyboard-shortcuts#readme">Read more &rarr;</a>

<br clear="all">

<a href="plugins/bb-plugin-chatgpt-theme#readme"><picture><source media="(prefers-color-scheme: dark)" srcset="plugins/bb-plugin-chatgpt-theme/assets/card-dark.png"><img src="plugins/bb-plugin-chatgpt-theme/assets/card-light.png" alt="bb wearing the ChatGPT palette, its light and dark halves meeting along the diagonal" align="right" width="48%"></picture></a>

### <img src="assets/icons/chatgpt-theme.svg" alt="" width="26" align="absmiddle"> &nbsp;ChatGPT theme

Restyle bb to match the OpenAI ChatGPT (Codex) desktop app.

```sh
bb plugin install chatgpt-theme@ariofrio
```

<a href="plugins/bb-plugin-chatgpt-theme#readme">Read more &rarr;</a>

<br clear="all">

## Install

Add this repository as a bb marketplace, then choose any of its plugins in
Settings → Plugins:

```sh
bb marketplace add git:github.com/ariofrio/bb-plugins
```

Or install one of them from the command line:

```sh
bb plugin install chatgpt-theme@ariofrio
```

The entry ids are `chatgpt-theme`, `missing-keyboard-shortcuts`,
`project-breadcrumbs`, `project-icons`, and `thread-stages`, and each plugin's
README repeats its own. Every entry resolves the plugin's highest
`<entry-id>/vX.Y.Z` release tag, so `bb plugin update <entry-id>` picks up new
releases and the marketplace never has to be re-added. Its catalog is defined
in [marketplace.json](marketplace.json). Nothing here is published to npm yet.

## Development

Clone the repository and install every plugin at once:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins
npm run install:plugins
```

Run the same command after a `git pull`: it installs whatever is missing, then
rebuilds and reloads every plugin.

To run one plugin's unreleased code without a checkout, install it from `main`
by its collection name — the names are listed in
[.bb/plugins.json](.bb/plugins.json):

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin chatgpt-theme
```

That install follows the branch rather than the release tags, so
`bb plugin update <plugin-id>` moves it to the newest commit on `main`.

### Releases

Create a Changeset with `npm run changeset` for every user-visible plugin
change. After the change reaches `main`, automation opens or updates a release
pull request with version, lockfile, and changelog updates. Merging that pull
request validates the affected plugins, creates immutable `<plugin-id>/vX.Y.Z`
Git tags, and publishes a
[GitHub release](https://github.com/ariofrio/bb-plugins/releases) per tag
carrying that version's changelog entry. Every listing accepts any released
version, so the catalog never changes with a release.

`npm run release:check` runs each plugin's tests, type checks, build, SDK
declaration verification, and packed artifact verification.
[CI](.github/workflows/plugins.yml) runs the same check for every plugin. Build
output in `dist/` is generated and is not committed.

## License

[MIT](LICENSE)
