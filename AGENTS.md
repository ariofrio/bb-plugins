# bb-plugins Instructions

## Plugin Changes

- When changing a bb plugin in this repository, keep the installed bb plugin state in sync before finishing: reinstall the plugin when its manifest, package name, or path changes, and reload or reinstall it after source changes so the running bb app uses the updated code.
- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.
