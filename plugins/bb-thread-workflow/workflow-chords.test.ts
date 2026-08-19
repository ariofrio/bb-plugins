import { describe, expect, it } from "vitest";
import { resolveStageChord } from "./workflow-chords";
import type { ReorderThreadLike } from "./workflow-reorder";
import type { ThreadAssignment } from "./workflow-stage";

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
  workflowStage: ThreadAssignment["workflowStage"],
  sortKey: string,
): ThreadAssignment {
  return { threadId, workflowStage, sortKey, updatedAt: 1 };
}

const threads = [thread("thr_open"), thread("thr_next"), thread("thr_later")];
const assignments = [
  assignment("thr_open", "To do", "a"),
  assignment("thr_next", "To do", "b"),
  assignment("thr_later", "To do", "c"),
];

describe("resolveStageChord", () => {
  it("files the open task and moves down to the task below it", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      workflowStage: "Done",
      next: { kind: "thread", threadId: "thr_next" },
    });
    expect(
      resolveStageChord({
        threadId: "thr_next",
        workflowStage: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_later" } });
  });

  it("falls back to the task above when filing the last one", () => {
    expect(
      resolveStageChord({
        threadId: "thr_later",
        workflowStage: "Done",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toMatchObject({ next: { kind: "thread", threadId: "thr_next" } });
  });

  it("starts at the top when the filed task was not in To do", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "Canceled",
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
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "Done",
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
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "Canceled",
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
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "Done",
        threads: [thread("thr_open")],
        assignments: [assignment("thr_open", "To do", "a")],
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      workflowStage: "Done",
      next: { kind: "compose" },
    });
  });

  it("brings a task back to To do and stays put", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "To do",
        threads,
        assignments: [
          assignment("thr_open", "Backlog", "a"),
          assignment("thr_next", "To do", "b"),
        ],
        undoCandidates: [],
      }),
    ).toEqual({
      kind: "file",
      workflowStage: "To do",
      next: { kind: "stay" },
    });
  });

  it("undoes the most recent filing when the open task is already To do", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "To do",
        threads,
        assignments,
        undoCandidates: [
          {
            threadId: "thr_later",
            previousStage: "To do",
            previousSortKey: "c",
            updatedAt: 20,
          },
          {
            threadId: "thr_next",
            previousStage: "Blocked",
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
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "To do",
        threads,
        assignments,
        undoCandidates: [
          {
            threadId: "thr_next",
            previousStage: "Blocked",
            previousSortKey: "b",
            updatedAt: 10,
          },
        ],
      }),
    ).toMatchObject({ kind: "restore", threadId: "thr_next", sortKey: null });
  });

  it("skips undo candidates whose thread the sidebar no longer shows", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "To do",
        threads: [thread("thr_open"), thread("thr_gone", { archivedAt: 3 })],
        assignments,
        undoCandidates: [
          {
            threadId: "thr_gone",
            previousStage: "To do",
            previousSortKey: "z",
            updatedAt: 30,
          },
        ],
      }),
    ).toEqual({ kind: "none" });
  });

  it("does nothing when there is nothing left to undo", () => {
    expect(
      resolveStageChord({
        threadId: "thr_open",
        workflowStage: "To do",
        threads,
        assignments,
        undoCandidates: [],
      }),
    ).toEqual({ kind: "none" });
  });
});
