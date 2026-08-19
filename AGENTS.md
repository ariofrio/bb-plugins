# bb-plugins Instructions

## Naming

- Write plugin names in sentence case: capitalize only the first word and any proper nouns (e.g. "Missing keyboard shortcuts"). This applies everywhere the name appears, including the `bb.name` field in `package.json`, README headings, and links.

## Layout

- Keep every TypeScript source under the plugin's `src/`, including the `bb.server` and `bb.app` entries, the vendored `components/`, `lib/`, and `hooks/` directories, generated data, and co-located `*.test.ts`. bb's own scaffold puts these in the plugin root; the manifest resolves plugin-relative paths either way, so point `bb.server` at `./src/server.ts` and set the tsconfig `@/*` alias to `./src/*`.
- Leave only packaging and tooling configuration in the plugin root, where npm and each tool require it: `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`, and `LICENSE`, plus `components.json` and `vitest.config.ts` when used. `assets/`, `skills/`, `themes/`, and build-time `scripts/` stay alongside `src/`.
- Ship sources without their tests by ending `files` with `"src", "!src/**/*.test.ts", "!src/**/*.test.tsx"`.
- README screenshots live in `assets/` beside the branding icon but are not worth shipping, so follow `"assets"` with `"!assets/screenshot*.png", "!assets/card*.png"`.
- A `scripts/` helper that imports plugin code reaches into `src/`, and anything it generates belongs in `src/` too.

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Screenshots

- Every plugin screenshot comes from `npm run screenshots`, which boots a throwaway bb, installs every plugin in this repository, seeds one shared fixture, and captures each shot in light and dark. Never edit or replace the files it writes by hand; change `scripts/screenshots/shots.mjs` and recapture.
- Each shot is captured twice from the same arranged window, with the same shade and cutouts: `screenshot-<mode>.png` is bb's whole default window and belongs in the plugin's own README, and `card-<mode>.png` is cropped to one fixed width and belongs in the root README's table, where a shared crop width is what keeps the five cells at one zoom level. A shot chooses where its card sits, not how large it is.
- Only the window shots carry a window frame — macOS's corner radius, a hairline, and a shadow, on transparent margins. A card is a crop of an interface, not a window, so framing one would claim it is the whole app.
- Capturing needs macOS, the bb desktop app, and `npx playwright install chromium`. `npm run check:screenshots` needs neither, and CI runs it to report a screenshot whose plugin changed after it was captured.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. Instead, for client-only state, use an agent-owned web or desktop client connected to the existing bb server. When the test can modify server or host-daemon state, start an isolated client with its own server and host daemon.
- Check a UI change by its rendered effect — `getComputedStyle`, real pointer and keyboard events — never by class names or DOM attributes. Markup that reads correctly still renders nothing when a plugin class falls outside the `@scope` root bb compiles its stylesheet into, and a dispatched `click()` passes where a real one is swallowed.
