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
      "To Do",
      "Working",
      "Waiting",
      "Deferred",
      "Canceled",
    ]);
    expect(parseThreadStatus("to-do")).toBe("To Do");
    expect(parseThreadStatus("TODO")).toBe("To Do");
    expect(parseThreadStatus("cancelled")).toBe("Canceled");
    expect(parseThreadStatus("not started")).toBeNull();
  });

  it("defaults unassigned threads to To Do and honors explicit positions", () => {
    const threads = [
      { id: "unassigned", updatedAt: 30 },
      { id: "second", updatedAt: 20 },
      { id: "first", updatedAt: 10 },
      { id: "working", updatedAt: 5 },
    ];
    const assignments: ThreadAssignment[] = [
      { threadId: "second", status: "To Do", position: 2048, updatedAt: 2 },
      { threadId: "first", status: "To Do", position: 1024, updatedAt: 1 },
      { threadId: "working", status: "Working", position: 1024, updatedAt: 3 },
    ];

    const groups = groupThreadsByStatus(threads, assignments);

    expect(groups["To Do"].map((thread) => thread.id)).toEqual([
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
});
