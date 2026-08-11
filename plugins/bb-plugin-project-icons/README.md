# Project icons

Gives every project an icon and an optional color, shown next to the project
name in the thread header.

The icon comes from [Hugeicons](https://hugeicons.com), the same set bb itself
draws from, so it matches bb's chrome exactly. Projects default to a folder;
bb's personal project always shows a chat bubble and cannot be changed.

Choosing a color is optional. Without one the icon inherits the surrounding
text color, which keeps it themed; picking one of bb's eight favicon colors —
red, orange, yellow, green, teal, blue, purple, or pink — overrides that.

## Install

Clone the repository and install this directory:

```sh
git clone https://github.com/ariofrio/bb-plugins.git
cd bb-plugins/plugins/bb-plugin-project-icons
npm install
bb plugin install . --yes
```

A direct `bb plugin install git:...` reads the plugin from the repository root,
so it cannot reach a plugin that lives in a subdirectory
([get-bb/bb#1097](https://github.com/get-bb/bb/issues/1097) tracks multi-plugin
repositories). Update an installed copy with:

```sh
git pull
npm install
npm run build
bb plugin reload project-icons
```

Installing a path builds the plugin; reloading loads what is already built.

## The icon catalog

`npm run build:catalog` regenerates `icon-catalog.json` and
`icon-catalog.generated.ts` from Hugeicons' published index. It keeps the
categories that describe a project rather than interface furniture, collapses
`-01`/`-02` name variants, and drops anything the free package does not export
— 2,532 icons across 32 categories. The result is committed, so builds and CI
never reach the network.

## Header placement

bb has no slot before the thread title, so the icon is portaled into the
header the same way [Project header
breadcrumb](../bb-plugin-project-header-breadcrumb#readme) portals the project
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
