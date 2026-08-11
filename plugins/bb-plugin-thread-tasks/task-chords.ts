import type { UndoCandidate } from "./store";
import {
  listedThreads,
  pinnedThreadIds,
  type ReorderThreadLike,
} from "./task-reorder";
import type { ThreadAssignment, ThreadStatus } from "./thread-status";

/** Where the client should go once the chord has been applied. */
export type ChordDestination =
  | { kind: "stay" }
  | { kind: "thread"; threadId: string }
  | { kind: "compose" };

export type StatusChord =
  | { kind: "none" }
  | { kind: "file"; taskStatus: ThreadStatus; next: ChordDestination }
  | {
      kind: "restore";
      threadId: string;
      sortKey: string | null;
      next: ChordDestination;
    };

export interface ResolveStatusChordInput {
  threadId: string;
  taskStatus: ThreadStatus;
  threads: readonly ReorderThreadLike[];
  assignments: readonly ThreadAssignment[];
  /** Newest first, already filtered to moves the user made in the app. */
  undoCandidates: readonly UndoCandidate[];
}

/**
 * Decides what a `.` chord does: file the open task and move on to the next
 * one, bring the open task back to To do, or — when it is already To do —
 * undo the user's most recent filing.
 */
export function resolveStatusChord({
  threadId,
  taskStatus,
  threads,
  assignments,
  undoCandidates,
}: ResolveStatusChordInput): StatusChord {
  const listed = listedThreads(threads);
  const openStatus = assignments.find(
    (assignment) => assignment.threadId === threadId,
  )?.taskStatus;

  if (taskStatus === "To do") {
    if (openStatus !== "To do") {
      return { kind: "file", taskStatus, next: { kind: "stay" } };
    }
    const candidate = undoCandidates.find((item) =>
      listed.some((thread) => thread.id === item.threadId),
    );
    if (candidate === undefined) return { kind: "none" };
    return {
      kind: "restore",
      threadId: candidate.threadId,
      sortKey:
        candidate.previousStatus === "To do" ? candidate.previousSortKey : null,
      next: { kind: "thread", threadId: candidate.threadId },
    };
  }

  const pinned = pinnedThreadIds(listed);
  const listedIds = new Set(listed.map((thread) => thread.id));
  const nextThreadId = assignments.find(
    (assignment) =>
      assignment.taskStatus === "To do" &&
      assignment.threadId !== threadId &&
      listedIds.has(assignment.threadId) &&
      !pinned.has(assignment.threadId),
  )?.threadId;

  return {
    kind: "file",
    taskStatus,
    next:
      nextThreadId === undefined
        ? { kind: "compose" }
        : { kind: "thread", threadId: nextThreadId },
  };
}
