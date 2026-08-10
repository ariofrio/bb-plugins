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

Project settings navigates inside bb's router. Rename and Remove use
version-matched bb dialog components and call the plugin backend, which applies
the mutation through bb's project SDK. The actions do not depend on the
sidebar or its project menu being mounted.

## Implementation

The plugin registers `experimental_threadHeaderAction` to receive the current
project and read its live name from `experimental_useSidebarThreads()`. Its
otherwise-hidden slot inserts a React portal immediately before bb's existing
thread-title container. The frontend action dialogs call schema-validated RPC
handlers registered by `server.ts` for project rename and removal.

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
