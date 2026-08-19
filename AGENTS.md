# bb-plugins Instructions

## Naming

- Write plugin names in sentence case: capitalize only the first word and any proper nouns (e.g. "Missing keyboard shortcuts"). This applies everywhere the name appears, including the `bb.name` field in `package.json`, README headings, and links.

## Layout

- Keep every TypeScript source under the plugin's `src/`, including the `bb.server` and `bb.app` entries, the vendored `components/`, `lib/`, and `hooks/` directories, generated data, and co-located `*.test.ts`. bb's own scaffold puts these in the plugin root; the manifest resolves plugin-relative paths either way, so point `bb.server` at `./src/server.ts` and set the tsconfig `@/*` alias to `./src/*`.
- Leave only packaging and tooling configuration in the plugin root, where npm and each tool require it: `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`, and `LICENSE`, plus `components.json` and `vitest.config.ts` when used. `assets/`, `skills/`, `themes/`, and build-time `scripts/` stay alongside `src/`.
- Ship sources without their tests by ending `files` with `"src", "!src/**/*.test.ts", "!src/**/*.test.tsx"`.
- A `scripts/` helper that imports plugin code reaches into `src/`, and anything it generates belongs in `src/` too.

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. Instead, for client-only state, use an agent-owned web or desktop client connected to the existing bb server. When the test can modify server or host-daemon state, start an isolated client with its own server and host daemon.
- Check a UI change by its rendered effect — `getComputedStyle`, real pointer and keyboard events — never by class names or DOM attributes. Markup that reads correctly still renders nothing when a plugin class falls outside the `@scope` root bb compiles its stylesheet into, and a dispatched `click()` passes where a real one is swallowed.
