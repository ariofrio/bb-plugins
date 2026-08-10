---
name: thread-tasks
description: Treat every bb thread as a task. Use when inspecting, organizing, or changing a thread's task status or position. Do not archive a thread to mark it as done or completed.
---

# Thread tasks

Every bb thread is a task. Task statuses, in canonical order, are **Done**,
**To Do**, **Working**, **Waiting**, **Deferred**, and **Canceled**.

Use `bb task list` to list tasks, `bb task show [<thread-id> | --self]` to
inspect one, and `bb task update [<thread-id> | --self] --status <status>` to
change it. Add `--after <thread-id>` or `--before <thread-id>` to position it.
