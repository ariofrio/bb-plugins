---
name: thread-stages
description: Organize root bb threads into the stages Backlog, To do, Working, Blocked, Done, and Canceled. Working and To do are assigned automatically when a root thread starts and pauses or ends. Use when inspecting, organizing, or changing a root thread's stage or position. Child threads inherit their root parent's placement. Do not archive a thread to mark it Done.
---

# Thread stages

Use `bb thread-stages list` to list organized threads, `bb thread-stages
show [<thread-id> | --self]` to inspect one, and `bb thread-stages update
[<thread-id> | --self] --stage <stage>` to change it. Add `--after
<thread-id>` or `--before <thread-id>` to position it.

Only root threads have a stage and position. A child thread always
appears beneath its parent in the root parent's stage. Target the root parent
when the user intends to move the whole thread hierarchy.

## Automatic stages

The stage follows the root thread's own work at lifecycle transitions:

- Starting a turn moves the root thread to **Working**.
- Ending a turn moves it back to **To do**, including when it waits on a
  question or approval.
- Between transitions, a stage set by hand stays put.

Set **Working** by hand only to correct it; Thread stages assigns it.
