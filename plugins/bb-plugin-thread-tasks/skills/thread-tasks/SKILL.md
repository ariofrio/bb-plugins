---
name: thread-tasks
description: Treat root bb threads as tasks with statuses Backlog, To do, Working, Blocked, Done, and Canceled, where Working and To do are assigned automatically when the root thread starts and pauses or ends. Use when inspecting, organizing, or changing a root thread's task status or position. Child threads inherit their root parent's task placement. Do not archive a thread to mark it as done or completed.
---

# Thread tasks

Use `bb task list` to list tasks, `bb task show [<thread-id> | --self]` to
inspect one, and `bb task update [<thread-id> | --self] --status <status>` to
change it. Add `--after <thread-id>` or `--before <thread-id>` to position it.

Only root threads are tasks. A child thread has no task status or position of
its own: it always appears beneath its parent in the root parent's status. Do
not run `bb task show` or `bb task update` against a child thread; target its
root parent when the user intends to change the whole task.

## Automatic status

Task status follows the root thread's own work, and only at transitions:

- Starting a turn moves the task to **Working**, whatever it was before.
- Ending a turn moves it back to **To do** — as does blocking on a question
  or an approval, because the next move is the user's.
- Between transitions nothing moves on its own, so a status you set by hand
  holds until the thread next starts or stops working.

Set **Working** by hand only to correct it; the workflow assigns it.
