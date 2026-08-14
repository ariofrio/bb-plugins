import type { UndoCandidate } from "./store";
import {
  listedThreads,
  pinnedThreadIds,
  type ReorderThreadLike,
} from "./task-reorder";
import { partitionTaskThreads } from "./task-ownership";
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
  const taskThreads = partitionTaskThreads(listed).taskThreads;
  if (!taskThreads.some((thread) => thread.id === threadId)) {
    return { kind: "none" };
  }
  const openStatus = assignments.find(
    (assignment) => assignment.threadId === threadId,
  )?.taskStatus;

  if (taskStatus === "To do") {
    if (openStatus !== "To do") {
      return { kind: "file", taskStatus, next: { kind: "stay" } };
    }
    const candidate = undoCandidates.find((item) =>
      taskThreads.some((thread) => thread.id === item.threadId),
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

  // Walk the To do section the way the sidebar renders it, so "the row below"
  // means the row below on screen.
  const threadById = new Map(taskThreads.map((thread) => [thread.id, thread]));
  const pinned = pinnedThreadIds(listed);
  const toDo = assignments
    .filter(
      (assignment) =>
        assignment.taskStatus === "To do" &&
        threadById.has(assignment.threadId) &&
        !pinned.has(assignment.threadId),
    )
    .flatMap((assignment) => threadById.get(assignment.threadId) ?? []);
  const rows = toDo.map((thread) => thread.id);

  const index = rows.indexOf(threadId);
  const nextThreadId =
    index === -1
      ? rows[0]
      : // Filing the last row leaves the one above it as the new last.
        (rows[index + 1] ?? rows[index - 1]);

  return {
    kind: "file",
    taskStatus,
    next:
      nextThreadId === undefined
        ? { kind: "compose" }
        : { kind: "thread", threadId: nextThreadId },
  };
}
