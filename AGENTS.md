# bb-plugins Instructions

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. For client-only state, use an agent-owned web or desktop client connected to the existing bb server. Start an isolated server or host daemon only when the test can modify server or host-daemon state.
