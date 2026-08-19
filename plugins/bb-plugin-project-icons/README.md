# Project icons

Gives every project an icon and an optional color, shown next to the project
name in the thread header and on each row of the [Thread
stages](../bb-plugin-thread-stages#readme) sidebar.

Click the icon in the header to change it: search 2,532 icons by name or
synonym, filter by category, and pick a color. Changes save as you click and
appear everywhere at once.

The icon comes from [Hugeicons](https://hugeicons.com), the same set bb itself
draws from, so it matches bb's chrome exactly. Projects default to a folder;
bb's personal project always shows a chat bubble and cannot be changed.

Choosing a color is optional. Without one the icon inherits the surrounding
text color, which keeps it themed; picking one of bb's eight favicon colors —
red, orange, yellow, green, teal, blue, purple, or pink — overrides that.

## Install

Install it from this repository's plugin collection:

```sh
bb plugin install git:https://github.com/ariofrio/bb-plugins.git@main --plugin project-icons
```

Update an installed copy with:

```sh
bb plugin update project-icons
```

## Where the catalog lives

The catalog is served by the plugin backend, not bundled into the app. The
client ships at 54 KB gzipped and fetches the full set once, the first time
the picker opens; a chosen icon travels with its drawing so other plugins can
render it without shipping the catalog themselves.

## The icon catalog

`npm run build:catalog` regenerates `icon-catalog.json` and
`icon-catalog.generated.ts` from Hugeicons' published index. It keeps the
categories that describe a project rather than interface furniture, collapses
`-01`/`-02` name variants, and drops anything the free package does not export
— 2,532 icons across 32 categories. The result is committed, so builds and CI
never reach the network.

## Header placement

bb has no slot before the thread title, so the icon is portaled into the
header the same way [Project
breadcrumbs](../bb-plugin-project-breadcrumbs#readme) portals the project
name: immediately before that breadcrumb when it is installed, and before the
title when it is not. `header-dom.test.ts` pins both shapes so a bb header
change fails locally rather than moving the icon silently.

## Development

```sh
npm run release:check
bb plugin reload project-icons
```

`release:check` runs the tests and typecheck, checks the committed SDK
declarations are current, builds, and installs the packed npm artifact in a
temporary directory to validate its contents. `dist/` is built, never
committed. The package is not published to npm yet, but it stays publishable
so it can be.

## License

[MIT](LICENSE)
