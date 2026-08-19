<h1 align="center"><a href="https://github.com/ariofrio">Andres Riofrio</a>'s bb plugins</h1>

<p align="center"><strong>Plugins for <a href="https://getbb.app">bb</a>, the agent IDE that builds itself</strong></p>

<p align="center">
  <a href="https://getbb.app"><img src="https://img.shields.io/badge/bb-0.39%2B-656D76?style=flat-square" alt="bb 0.39+"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ariofrio/bb-plugins?style=flat-square&color=656D76" alt="MIT license"></a>
  <a href="https://github.com/ariofrio/bb-plugins/actions/workflows/plugins.yml"><img src="https://img.shields.io/github/actions/workflow/status/ariofrio/bb-plugins/plugins.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
</p>

<br>

<table>
  <thead>
    <tr>
      <th align="center" width="33%">Organization</th>
      <th align="center" width="33%">Navigation</th>
      <th align="center" width="33%">Themes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top" align="center">
        <p></p>
        <p><a href="plugins/bb-plugin-thread-stages#readme"><img src="plugins/bb-plugin-thread-stages/assets/icon.svg" alt="" width="40" height="40"><br><strong>Thread stages</strong></a></p>
        <p>Group threads in the sidebar into stages from Backlog to Done, updating as they run.</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><a href="plugins/bb-plugin-project-breadcrumbs#readme"><img src="plugins/bb-plugin-project-breadcrumbs/assets/icon.svg" alt="" width="40" height="40"><br><strong>Project breadcrumbs</strong></a></p>
        <p>Show and manage a thread's project from its header.</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><a href="plugins/bb-plugin-chatgpt-theme#readme"><img src="plugins/bb-plugin-chatgpt-theme/assets/icon.svg" alt="" width="40" height="40"><br><strong>ChatGPT theme</strong></a></p>
        <p>Restyle bb to match the OpenAI ChatGPT (Codex) desktop app.</p>
        <p></p>
      </td>
    </tr>
    <tr>
      <td valign="top" align="center">
        <p></p>
        <p><a href="plugins/bb-plugin-project-icons#readme"><img src="plugins/bb-plugin-project-icons/assets/icon.svg" alt="" width="40" height="40"><br><strong>Project icons</strong></a></p>
        <p>Give each project an icon and color.</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><a href="plugins/bb-plugin-missing-keyboard-shortcuts#readme"><img src="plugins/bb-plugin-missing-keyboard-shortcuts/assets/icon.svg" alt="" width="40" height="40"><br><strong>Missing keyboard shortcuts</strong></a></p>
        <p>Add shortcuts to start personal or project threads, navigate history, and reach the composer or panel tabs.</p>
        <p></p>
      </td>
      <td></td>
    </tr>
  </tbody>
</table>

## Install

Add this repository as a bb marketplace, then choose any of its plugins in
Settings → Plugins:

```sh
bb marketplace add git:github.com/ariofrio/bb-plugins@main
```

The marketplace tracks each plugin's Git release tags, so new releases appear
without re-adding it. Its catalog is defined in
[marketplace.json](marketplace.json).

To install one plugin directly from `main`, follow its README, or select it
from the repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin chatgpt-theme
```

The available collection names are listed in [.bb/plugins.json](.bb/plugins.json).
Nothing here is published to npm yet.

## Development

Clone the repository and install every plugin at once:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins
npm run install:plugins
```

Run the same command after a `git pull`: it installs whatever is missing, then
rebuilds and reloads every plugin.

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
