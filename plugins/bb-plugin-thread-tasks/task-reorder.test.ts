import { describe, expect, it } from "vitest";
import { resolveTaskReorder, type ReorderThreadLike } from "./task-reorder";
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

const threads = [thread("thr_a"), thread("thr_b"), thread("thr_c")];
const assignments = [
  assignment("thr_a", "To do", "a"),
  assignment("thr_b", "To do", "b"),
  assignment("thr_c", "To do", "c"),
];

describe("resolveTaskReorder", () => {
  it("steps a task between its neighbors", () => {
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_c",
        taskStatus: "To do",
        intent: { scope: "step", direction: -1 },
      }),
    ).toEqual({
      kind: "order",
      taskStatus: "To do",
      previousThreadId: "thr_a",
      nextThreadId: "thr_b",
    });
  });

  it("sends a task to the end of its status", () => {
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_a",
        taskStatus: "To do",
        intent: { scope: "edge", direction: 1 },
      }),
    ).toEqual({
      kind: "order",
      taskStatus: "To do",
      previousThreadId: "thr_c",
      nextThreadId: null,
    });
  });

  it("does nothing at the edge a task already occupies", () => {
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_a",
        taskStatus: "To do",
        intent: { scope: "step", direction: -1 },
      }),
    ).toEqual({ kind: "none" });
  });

  it("steps to the neighboring status and stops at the ends", () => {
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_b",
        taskStatus: "To do",
        intent: { scope: "status", direction: -1 },
      }),
    ).toEqual({ kind: "status", taskStatus: "Done" });
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_b",
        taskStatus: "Done",
        intent: { scope: "status", direction: -1 },
      }),
    ).toEqual({ kind: "none" });
    expect(
      resolveTaskReorder({
        threads,
        assignments,
        threadId: "thr_b",
        taskStatus: "Canceled",
        intent: { scope: "status", direction: 1 },
      }),
    ).toEqual({ kind: "none" });
  });

  it("moves among rows at the task's own depth", () => {
    const nested = [
      thread("thr_a"),
      thread("thr_a1", { parentThreadId: "thr_a" }),
      thread("thr_b"),
      thread("thr_c"),
    ];
    const nestedAssignments = [
      assignment("thr_a", "To do", "a"),
      assignment("thr_a1", "To do", "b"),
      assignment("thr_b", "To do", "c"),
      assignment("thr_c", "To do", "d"),
    ];

    expect(
      resolveTaskReorder({
        threads: nested,
        assignments: nestedAssignments,
        threadId: "thr_b",
        taskStatus: "To do",
        intent: { scope: "step", direction: -1 },
      }),
    ).toEqual({
      kind: "order",
      taskStatus: "To do",
      previousThreadId: null,
      nextThreadId: "thr_a",
    });
    expect(
      resolveTaskReorder({
        threads: nested,
        assignments: nestedAssignments,
        threadId: "thr_a1",
        taskStatus: "To do",
        intent: { scope: "step", direction: 1 },
      }),
    ).toEqual({ kind: "none" });
  });

  it("reorders a pinned thread among the pinned roots", () => {
    const pinned = [
      thread("thr_a", { pinnedAt: 3, pinSortKey: "a" }),
      thread("thr_b", { pinnedAt: 2, pinSortKey: "b" }),
      thread("thr_b1", { parentThreadId: "thr_b" }),
      thread("thr_c", { pinnedAt: 1, pinSortKey: "c" }),
    ];

    expect(
      resolveTaskReorder({
        threads: pinned,
        assignments,
        threadId: "thr_c",
        taskStatus: "To do",
        intent: { scope: "edge", direction: -1 },
      }),
    ).toEqual({
      kind: "pinned",
      previousThreadId: null,
      nextThreadId: "thr_a",
    });
  });

  it("ignores archived, hidden, and unknown threads", () => {
    const mixed = [
      thread("thr_a"),
      thread("thr_hidden", { visibility: "hidden" }),
      thread("thr_archived", { archivedAt: 5 }),
      thread("thr_c"),
    ];
    const mixedAssignments = [
      assignment("thr_a", "To do", "a"),
      assignment("thr_hidden", "To do", "b"),
      assignment("thr_archived", "To do", "c"),
      assignment("thr_c", "To do", "d"),
    ];

    expect(
      resolveTaskReorder({
        threads: mixed,
        assignments: mixedAssignments,
        threadId: "thr_c",
        taskStatus: "To do",
        intent: { scope: "step", direction: -1 },
      }),
    ).toEqual({
      kind: "order",
      taskStatus: "To do",
      previousThreadId: null,
      nextThreadId: "thr_a",
    });
    expect(
      resolveTaskReorder({
        threads: mixed,
        assignments: mixedAssignments,
        threadId: "thr_missing",
        taskStatus: "To do",
        intent: { scope: "step", direction: -1 },
      }),
    ).toEqual({ kind: "none" });
  });
});
