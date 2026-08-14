import { describe, expect, it } from "vitest";
import { resolveStatusChord } from "./task-chords";
import type { ReorderThreadLike } from "./task-reorder";
import type { ThreadAssignment } from "./thread-status";

function thread(
  id: string,
  overrides: Partial<ReorderThreadLike> = {},
): ReorderThreadLike {
  return {
    id,
    parentThreadId: null,
    visibility: "visible",
    archivedAt: null,
    pinnedAt: null,
    pinSortKey: null,
    createdAt: 1,
    ...overrides,
  };
}

function assignment(
  threadId: string,
  taskStatus: ThreadAssignment["taskStatus"],
  sortKey: string,
): ThreadAssignment {
  return { threadId, taskStatus, sortKey, updatedAt: 1 };
}

const threads = [thread("thr_open"), thread("thr_next"), thread("thr_later")];
const assignments = [
  assignment("thr_open", "To do", "a"),
  assignment("thr_next", "To do", "b"),
  assignment("thr_later", "To do", "c"),
];

describe("resolveStatusChord", () => {
  it("files the open task and moves down to the task below it", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      taskStatus: "Done",
      next: { kind: "thread", threadId: "thr_next" },
    });
    expect(
      resolveStatusChord({
        threadId: "thr_next",
        taskStatus: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_later" } });
  });

  it("falls back to the task above when filing the last one", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_later",
        taskStatus: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_next" } });
  });

  it("starts at the top when the filed task was not in To do", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "Canceled",
        threads,
        assignments: [
          assignment("thr_open", "Backlog", "a"),
          assignment("thr_next", "To do", "b"),
          assignment("thr_later", "To do", "c"),
        ],
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_next" } });
  });

  it("skips child rows when picking the next task", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "Done",
        threads: [
          thread("thr_open"),
          thread("thr_child", { parentThreadId: "thr_open" }),
          thread("thr_next"),
        ],
        assignments: [
          assignment("thr_open", "To do", "a"),
          assignment("thr_next", "To do", "c"),
        ],
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_next" } });
  });

  it("skips the filed task, pinned threads, and threads the sidebar hides", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "Canceled",
        threads: [
          thread("thr_open"),
          thread("thr_pinned", { pinnedAt: 5, pinSortKey: "a" }),
          thread("thr_hidden", { visibility: "hidden" }),
          thread("thr_archived", { archivedAt: 9 }),
          thread("thr_next"),
        ],
        assignments: [
          assignment("thr_open", "To do", "a"),
          assignment("thr_pinned", "To do", "b"),
          assignment("thr_hidden", "To do", "c"),
          assignment("thr_archived", "To do", "d"),
          assignment("thr_next", "To do", "e"),
        ],
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_next" } });
  });

  it("opens an empty composer when nothing is left to do", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "Done",
        threads: [thread("thr_open")],
        assignments: [assignment("thr_open", "To do", "a")],
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      taskStatus: "Done",
      next: { kind: "compose" },
    });
  });

  it("brings a task back to To do and stays put", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "To do",
        threads,
        assignments: [
          assignment("thr_open", "Backlog", "a"),
          assignment("thr_next", "To do", "b"),
        ],
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      taskStatus: "To do",
      next: { kind: "stay" },
    });
  });

  it("undoes the most recent filing when the open task is already To do", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "To do",
        threads,
        assignments,
        undoCandidates: [
          {
            threadId: "thr_later",
            previousStatus: "To do",
            previousSortKey: "c",
            updatedAt: 20,
          },
          {
            threadId: "thr_next",
            previousStatus: "Blocked",
            previousSortKey: "b",
            updatedAt: 10,
          },
        ],
      }),
    ).toEqual({
      kind: "restore",
      threadId: "thr_later",
      sortKey: "c",
      next: { kind: "thread", threadId: "thr_later" },
    });
  });

  it("appends a restored task that never sat in To do", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "To do",
        threads,
        assignments,
        undoCandidates: [
          {
            threadId: "thr_next",
            previousStatus: "Blocked",
            previousSortKey: "b",
            updatedAt: 10,
          },
        ],
      }),
    ).toMatchObject({ kind: "restore", threadId: "thr_next", sortKey: null });
  });

  it("skips undo candidates whose thread the sidebar no longer shows", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "To do",
        threads: [thread("thr_open"), thread("thr_gone", { archivedAt: 3 })],
        assignments,
        undoCandidates: [
          {
            threadId: "thr_gone",
            previousStatus: "To do",
            previousSortKey: "z",
            updatedAt: 30,
          },
        ],
      }),
    ).toEqual({ kind: "none" });
  });

  it("does nothing when there is nothing left to undo", () => {
    expect(
      resolveStatusChord({
        threadId: "thr_open",
        taskStatus: "To do",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toEqual({ kind: "none" });
  });
});
