import { describe, expect, it } from "vitest";
import {
  THREAD_STATUSES,
  destinationOrder,
  groupThreadsByStatus,
  parseThreadStatus,
  type ThreadAssignment,
} from "./thread-status";

describe("thread statuses", () => {
  it("keeps the supported labels stable and accepts friendly CLI spellings", () => {
    expect(THREAD_STATUSES).toEqual([
      "Backlog",
      "To do",
      "Working",
      "Blocked",
      "Done",
      "Canceled",
    ]);
    expect(parseThreadStatus("backlog")).toBe("Backlog");
    expect(parseThreadStatus("deferred")).toBe("Backlog");
    expect(parseThreadStatus("waiting")).toBe("Blocked");
    expect(parseThreadStatus("to-do")).toBe("To do");
    expect(parseThreadStatus("TODO")).toBe("To do");
    expect(parseThreadStatus("cancelled")).toBe("Canceled");
    expect(parseThreadStatus("not started")).toBeNull();
  });

  it("defaults unassigned threads to To do and honors explicit sort keys", () => {
    const threads = [
      { id: "unassigned", updatedAt: 30 },
      { id: "second", updatedAt: 20 },
      { id: "first", updatedAt: 10 },
      { id: "working", updatedAt: 5 },
    ];
    const assignments: ThreadAssignment[] = [
      { threadId: "second", taskStatus: "To do", sortKey: "k", updatedAt: 2 },
      { threadId: "first", taskStatus: "To do", sortKey: "U", updatedAt: 1 },
      {
        threadId: "working",
        taskStatus: "Working",
        sortKey: "U",
        updatedAt: 3,
      },
    ];

    const groups = groupThreadsByStatus(threads, assignments);

    expect(groups["To do"].map((thread) => thread.id)).toEqual([
      "first",
      "second",
      "unassigned",
    ]);
    expect(groups.Working.map((thread) => thread.id)).toEqual(["working"]);
    expect(groups.Done).toEqual([]);
  });

  it("defaults assignments from an incompatible bundle to To do", () => {
    const assignments = [
      {
        threadId: "newer-status",
        taskStatus: "Review",
        sortKey: "U",
        updatedAt: 1,
      },
    ] as unknown as ThreadAssignment[];

    const groups = groupThreadsByStatus(
      [{ id: "newer-status", updatedAt: 1 }],
      assignments,
    );

    expect(groups["To do"].map((thread) => thread.id)).toEqual(["newer-status"]);
  });

  it("groups every descendant under its root task status", () => {
    const threads = [
      { id: "child", parentThreadId: "parent", updatedAt: 4 },
      { id: "other", parentThreadId: null, updatedAt: 3 },
      { id: "grandchild", parentThreadId: "child", updatedAt: 2 },
      { id: "parent", parentThreadId: null, updatedAt: 1 },
    ];
    const assignments: ThreadAssignment[] = [
      { threadId: "parent", taskStatus: "Done", sortKey: "a", updatedAt: 1 },
      { threadId: "child", taskStatus: "Working", sortKey: "b", updatedAt: 2 },
      { threadId: "grandchild", taskStatus: "Blocked", sortKey: "c", updatedAt: 3 },
      { threadId: "other", taskStatus: "To do", sortKey: "d", updatedAt: 4 },
    ];

    const groups = groupThreadsByStatus(threads, assignments);

    expect(groups.Done.map(({ id }) => id)).toEqual([
      "child",
      "grandchild",
      "parent",
    ]);
    expect(groups.Working).toEqual([]);
    expect(groups.Blocked).toEqual([]);
    expect(groups["To do"].map(({ id }) => id)).toEqual(["other"]);
  });

  it("computes reorder and cross-group destination orders", () => {
    expect(destinationOrder(["a", "b", "c"], "c", "a")).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(destinationOrder(["a", "b"], "new", null)).toEqual([
      "a",
      "b",
      "new",
    ]);
    expect(destinationOrder(["a", "b", "c"], "b", "c")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("preserves the order when a task is dropped onto its current position", () => {
    expect(destinationOrder(["a", "b", "c"], "b", "b")).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
