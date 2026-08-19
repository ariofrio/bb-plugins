<h1 align="center">ariofrio's bb plugins</h1>

<p align="center"><strong>Plugins for <a href="https://getbb.app">bb</a>, the agent IDE that builds itself</strong></p>

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
        <p><img src="assets/plugin-icons/list-todo.svg" alt="" width="40" height="40"><br><strong><a href="plugins/bb-plugin-thread-workflow#readme">Thread workflow</a></strong></p>
        <p>Groups sidebar threads into drag-ordered workflow stages that update as they run</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><img src="assets/plugin-icons/folder.svg" alt="" width="40" height="40"><br><strong><a href="plugins/bb-plugin-project-header-breadcrumb#readme">Project header breadcrumb</a></strong></p>
        <p>Adds the current project and its actions menu before each thread title</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><img src="assets/plugin-icons/palette.svg" alt="" width="40" height="40"><br><strong><a href="plugins/bb-plugin-codex-theme#readme">Codex theme</a></strong></p>
        <p>Matches bb's palette to the OpenAI ChatGPT desktop app, light and dark</p>
        <p></p>
      </td>
    </tr>
    <tr>
      <td valign="top" align="center">
        <p></p>
        <p><img src="assets/plugin-icons/palette.svg" alt="" width="40" height="40"><br><strong><a href="plugins/bb-plugin-project-icons#readme">Project icons</a></strong></p>
        <p>Gives each project an icon and optional color, in the thread header and sidebar</p>
        <p></p>
      </td>
      <td valign="top" align="center">
        <p></p>
        <p><img src="assets/plugin-icons/zap.svg" alt="" width="40" height="40"><br><strong><a href="plugins/bb-plugin-missing-keyboard-shortcuts#readme">Missing keyboard shortcuts</a></strong></p>
        <p>Adds shortcuts for threads, history, the composer, side chats, and terminals</p>
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

The marketplace tracks each plugin's compatible Git release tags, so new
releases appear without re-adding it. Its catalog is defined in
[marketplace.json](marketplace.json).

To install one plugin directly from `main`, follow its README, or select it
from the repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin codex-theme
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
request validates the affected plugins and creates immutable
`<plugin-id>/vX.Y.Z` Git tags. Marketplace semver ranges then expose compatible
releases without catalog changes.

`npm run release:check` runs each plugin's tests, type checks, build, SDK
declaration verification, and packed artifact verification.
[CI](.github/workflows/plugins.yml) runs the same check for every plugin. Build
output in `dist/` is generated and is not committed.

## License

[MIT](LICENSE)
