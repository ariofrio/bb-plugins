import { describe, expect, it } from "vitest";
import {
  WORKFLOW_STAGES,
  destinationOrder,
  groupThreadsByStage,
  parseWorkflowStage,
  type ThreadAssignment,
} from "./workflow-stage";

describe("thread statuses", () => {
  it("keeps the supported labels stable and accepts friendly CLI spellings", () => {
    expect(WORKFLOW_STAGES).toEqual([
      "Backlog",
      "To do",
      "Working",
      "Blocked",
      "Done",
      "Canceled",
    ]);
    expect(parseWorkflowStage("backlog")).toBe("Backlog");
    expect(parseWorkflowStage("deferred")).toBe("Backlog");
    expect(parseWorkflowStage("waiting")).toBe("Blocked");
    expect(parseWorkflowStage("to-do")).toBe("To do");
    expect(parseWorkflowStage("TODO")).toBe("To do");
    expect(parseWorkflowStage("cancelled")).toBe("Canceled");
    expect(parseWorkflowStage("not started")).toBeNull();
  });

  it("defaults unassigned threads to To do and honors explicit sort keys", () => {
    const threads = [
      { id: "unassigned", updatedAt: 30 },
      { id: "second", updatedAt: 20 },
      { id: "first", updatedAt: 10 },
      { id: "working", updatedAt: 5 },
    ];
    const assignments: ThreadAssignment[] = [
      { threadId: "second", workflowStage: "To do", sortKey: "k", updatedAt: 2 },
      { threadId: "first", workflowStage: "To do", sortKey: "U", updatedAt: 1 },
      {
        threadId: "working",
        workflowStage: "Working",
        sortKey: "U",
        updatedAt: 3,
      },
    ];

    const groups = groupThreadsByStage(threads, assignments);

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
        workflowStage: "Review",
        sortKey: "U",
        updatedAt: 1,
      },
    ] as unknown as ThreadAssignment[];

    const groups = groupThreadsByStage(
      [{ id: "newer-status", updatedAt: 1 }],
      assignments,
    );

    expect(groups["To do"].map((thread) => thread.id)).toEqual(["newer-status"]);
  });

  it("groups every descendant under its root workflow stage", () => {
    const threads = [
      { id: "child", parentThreadId: "parent", updatedAt: 4 },
      { id: "other", parentThreadId: null, updatedAt: 3 },
      { id: "grandchild", parentThreadId: "child", updatedAt: 2 },
      { id: "parent", parentThreadId: null, updatedAt: 1 },
    ];
    const assignments: ThreadAssignment[] = [
      { threadId: "parent", workflowStage: "Done", sortKey: "a", updatedAt: 1 },
      { threadId: "child", workflowStage: "Working", sortKey: "b", updatedAt: 2 },
      { threadId: "grandchild", workflowStage: "Blocked", sortKey: "c", updatedAt: 3 },
      { threadId: "other", workflowStage: "To do", sortKey: "d", updatedAt: 4 },
    ];

    const groups = groupThreadsByStage(threads, assignments);

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
