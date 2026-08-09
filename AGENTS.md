# bb-plugins Instructions

## Workflow

- After every atomic plugin change that you are confident works correctly, install or reload it in bb as applicable, verify it with the relevant tests and checks, then commit and push it before moving on.

## Testing

- For bb UI tests and experiments, never drive the user's active bb client. Start or use an agent-owned isolated bb client instead.
