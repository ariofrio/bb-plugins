# Ribbon Instructions

## Naming

- Write plugin names in sentence case: capitalize only the first word and any proper nouns (e.g. "Missing keyboard shortcuts"). This applies everywhere the name appears, including the `bb.name` field in `package.json`, README headings, and links.

## Layout

- Keep every TypeScript source under the plugin's `src/`, including the `bb.server` and `bb.app` entries, the vendored `components/`, `lib/`, and `hooks/` directories, generated data, and co-located `*.test.ts`. bb's own scaffold puts these in the plugin root; the manifest resolves plugin-relative paths either way, so point `bb.server` at `./src/server.ts` and set the tsconfig `@/*` alias to `./src/*`.
- Leave only packaging and tooling configuration in the plugin root, where npm and each tool require it: `package.json`, `package-lock.json`, `tsconfig.json`, `README.md`, `CHANGELOG.md`, and `LICENSE`, plus `components.json` and `vitest.config.ts` when used. `assets/`, `skills/`, `themes/`, and build-time `scripts/` stay alongside `src/`.
- Ship sources without their tests by ending `files` with `"src", "!src/**/*.test.ts", "!src/**/*.test.tsx"`.
- README screenshots live in `assets/` beside the branding icon but are not worth shipping, so follow `"assets"` with `"!assets/screenshot*.png", "!assets/card*.png"`.
- The repository's own `assets/` holds what the root README draws and no plugin ships: the hero, the dividers a narrow page needs, and `icons/`, whose files are derived from each plugin's own icon by `npm run build:heading-icons` and reported stale by `npm run check:heading-icons`.
- A `scripts/` helper that imports plugin code reaches into `src/`, and anything it generates belongs in `src/` too.

## UI components

- Prefer vendoring the matching component from bb's release-pinned `@bb` shadcn registry over composing the control directly from Radix or recreating bb's chrome. Layer plugin-specific behavior onto the vendored component; use primitives or a bespoke component only when the registry component cannot support the required interaction, and preserve the native motion, focus, responsive, and portal behavior in that exception.

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Screenshots

- Every plugin screenshot comes from `npm run screenshots`, which boots a throwaway bb, installs every plugin in this repository, seeds one shared fixture, and captures each shot in light and dark. Never edit or replace the files it writes by hand; change `scripts/screenshots/shots.mjs` and recapture.
- Each shot is captured twice from the same arranged window, with the same shade and cutouts: `screenshot-<mode>.png` is the whole window and belongs in the plugin's own README, and `card-<mode>.png` is cropped to one fixed width and belongs in the plugin's row in the root README, where a shared crop width is what keeps the five rows at one zoom level. A shot chooses where its card sits and how large a window it is framed in, but not how large the card is drawn.
- Both carry rounded corners and no shadow, and only the window shots carry the hairline edge that makes a window a window. Margins in an image are margins a reader sees, so they exist only where a layout needs them: a card is written twice, flush for the column that stacks it and with a left margin for the column that floats it beside a paragraph.
- A shot of the collection rather than of a plugin writes to the repository's own `assets/`: `hero-<mode>.png` shades nothing, because it points at nothing. Every other shot names the plugin it belongs to, and lands beside that plugin's own README.
- Whatever the capturing machine brings with it stays out of frame, and whatever the app resolves late is waited for rather than raced — the update chips report this machine's pending updates, and the composer's permission mode arrives after the thread does. Two runs on one machine write the same files byte for byte; that is the bar a change to the harness has to keep.
- Capturing needs macOS, the bb desktop app, and `npx playwright install chromium`. `npm run check:screenshots` needs neither, and CI runs it to report a screenshot whose plugin changed after it was captured.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. Instead, for client-only state, use an agent-owned web or desktop client connected to the existing bb server. When the test can modify server or host-daemon state, start an isolated client with its own server and host daemon.
- Check a UI change by its rendered effect — `getComputedStyle`, real pointer and keyboard events — never by class names or DOM attributes. Markup that reads correctly still renders nothing when a plugin class falls outside the `@scope` root bb compiles its stylesheet into, and a dispatched `click()` passes where a real one is swallowed.
