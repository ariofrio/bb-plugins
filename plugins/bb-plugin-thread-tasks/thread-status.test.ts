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
      "Done",
      "To do",
      "Working",
      "Waiting",
      "Deferred",
      "Canceled",
    ]);
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
