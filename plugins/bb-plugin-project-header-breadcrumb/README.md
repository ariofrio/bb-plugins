# Project Header Breadcrumb

Adds the current project to each standard-project thread header:

```text
bb-plugins  >  Add project header breadcrumb
```

The project name uses the same muted, hoverable treatment as bb's project
settings breadcrumb. The existing thread title node is left in place, so it
retains bb's normal-weight thread-header typography.

Clicking the project name opens a menu containing:

- Project settings
- Rename
- Remove

Each choice delegates to bb's native project actions. Navigation therefore
stays inside bb's router, while Rename and Remove use bb's existing dialogs,
mutations, validation, and deletion confirmation.

## Implementation

The plugin registers `experimental_threadHeaderAction` to receive the current
project and read its live name from `experimental_useSidebarThreads()`. Its
otherwise-hidden slot inserts a React portal immediately before bb's existing
thread-title container.

This deliberately relies on bb's private thread-header DOM structure because
the plugin SDK has no title-prefix slot. `header-dom.test.ts` documents and
tests the expected structure so a future bb header change fails locally rather
than silently changing the thread title.

Personal-project threads are left unchanged because they do not have the
standard Project settings/Rename/Remove action set.

## Install

```sh
npm install
npm test
npm run typecheck
npm run build
bb plugin install .
```

After editing sources:

```sh
bb plugin reload project-header-breadcrumb
```
