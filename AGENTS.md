# bb-plugins Instructions

## Naming

- Write plugin names in sentence case: capitalize only the first word and any proper nouns (e.g. "Missing keyboard shortcuts"). This applies everywhere the name appears, including the `bb.name` field in `package.json`, README headings, and links.

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. For client-only state, use an agent-owned web or desktop client connected to the existing bb server. Start an isolated server or host daemon only when the test can modify server or host-daemon state.
