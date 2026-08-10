---
name: thread-tasks
description: Treat every bb thread as a task with statuses Done, To do, Working, Waiting, Deferred, and Canceled, where Working and To do are assigned automatically when the turn starts and pauses or ends. Use when inspecting, organizing, or changing a thread's task status or position. Do not archive a thread to mark it as done or completed.
---

# Thread tasks

Use `bb task list` to list tasks, `bb task show [<thread-id> | --self]` to
inspect one, and `bb task update [<thread-id> | --self] --status <status>` to
change it. Add `--after <thread-id>` or `--before <thread-id>` to position it.

## Automatic status

Task status follows the thread's own work, and only at transitions:

- Starting a turn moves the task to **Working**, whatever it was before.
- Ending a turn moves it back to **To do** — as does blocking on a question
  or an approval, because the next move is the user's.
- Between transitions nothing moves on its own, so a status you set by hand
  holds until the thread next starts or stops working.

Set **Working** by hand only to correct it; the workflow assigns it.
