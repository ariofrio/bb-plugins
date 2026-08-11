import {
  buildPinnedThreadState,
  sortExplicitPinnedThreadIds,
} from "./pinned-threads";
import { reorderTargetId, type ReorderIntent } from "./task-shortcuts";
import {
  effectiveHierarchyParentId,
  flattenThreadHierarchy,
} from "./thread-hierarchy";
import {
  THREAD_STATUSES,
  destinationOrder,
  type ThreadAssignment,
  type ThreadStatus,
} from "./thread-status";

/** The thread fields the sidebar's grouping and pinning rules depend on. */
export interface ReorderThreadLike {
  id: string;
  parentThreadId: string | null;
  visibility: "visible" | "hidden";
  archivedAt: number | null;
  pinnedAt: number | null;
  pinSortKey: string | null;
  createdAt: number;
}

export type TaskReorder =
  | { kind: "none" }
  | { kind: "status"; taskStatus: ThreadStatus }
  | {
      kind: "order";
      taskStatus: ThreadStatus;
      previousThreadId: string | null;
      nextThreadId: string | null;
    }
  | { kind: "pinned"; previousThreadId: string | null; nextThreadId: string | null };

export interface ResolveTaskReorderInput {
  threads: readonly ReorderThreadLike[];
  assignments: readonly ThreadAssignment[];
  threadId: string;
  taskStatus: ThreadStatus;
  intent: ReorderIntent;
}

/** The threads the sidebar lists at all. */
export function listedThreads(
  threads: readonly ReorderThreadLike[],
): readonly ReorderThreadLike[] {
  return threads.filter(
    (thread) => thread.visibility === "visible" && thread.archivedAt === null,
  );
}

/** Threads the sidebar renders in its pinned section instead of a status. */
export function pinnedThreadIds(
  listed: readonly ReorderThreadLike[],
): ReadonlySet<string> {
  return buildPinnedThreadState(
    listed.map((thread) => ({
      id: thread.id,
      isPinned: thread.pinnedAt !== null,
      parentThreadId: thread.parentThreadId,
    })),
    sortExplicitPinnedThreadIds(listed),
  ).effectivePinnedThreadIds;
}

function neighbors(
  orderedIds: readonly string[],
  threadId: string,
  beforeThreadId: string | null,
): { previousThreadId: string | null; nextThreadId: string | null } {
  const order = destinationOrder(orderedIds, threadId, beforeThreadId);
  const index = order.indexOf(threadId);
  return {
    previousThreadId: order[index - 1] ?? null,
    nextThreadId: order[index + 1] ?? null,
  };
}

/**
 * Works out how a reorder chord should move a task, in the same terms the
 * sidebar uses: the stored order of a status, minus the threads the sidebar
 * hides, with siblings taken at the task's own hierarchy depth.
 */
export function resolveTaskReorder({
  threads,
  assignments,
  threadId,
  taskStatus,
  intent,
}: ResolveTaskReorderInput): TaskReorder {
  if (intent.scope === "status") {
    const nextStatus =
      THREAD_STATUSES[THREAD_STATUSES.indexOf(taskStatus) + intent.direction];
    return nextStatus === undefined
      ? { kind: "none" }
      : { kind: "status", taskStatus: nextStatus };
  }

  const listed = listedThreads(threads);
  if (!listed.some((thread) => thread.id === threadId)) return { kind: "none" };
  const pinnedState = buildPinnedThreadState(
    listed.map((thread) => ({
      id: thread.id,
      isPinned: thread.pinnedAt !== null,
      parentThreadId: thread.parentThreadId,
    })),
    sortExplicitPinnedThreadIds(listed),
  );

  if (pinnedState.effectivePinnedThreadIds.has(threadId)) {
    const pinnedRootIds = flattenThreadHierarchy(
      pinnedState.pinnedThreads,
      new Set<string>(),
    )
      .filter(({ depth }) => depth === 0)
      .map(({ thread }) => thread.id);
    const target = reorderTargetId(
      pinnedRootIds,
      pinnedRootIds,
      threadId,
      intent.scope,
      intent.direction,
    );
    if (target === null) return { kind: "none" };
    return {
      kind: "pinned",
      ...neighbors(pinnedRootIds, threadId, target.beforeThreadId),
    };
  }

  const threadById = new Map(listed.map((thread) => [thread.id, thread]));
  const orderedIds = assignments
    .filter((item) => item.taskStatus === taskStatus)
    .map((item) => item.threadId)
    .filter(
      (id) =>
        threadById.has(id) && !pinnedState.effectivePinnedThreadIds.has(id),
    );
  const idsInStatus = new Set(orderedIds);
  const parentIdOf = (id: string): string | null => {
    const thread = threadById.get(id);
    return thread === undefined
      ? null
      : effectiveHierarchyParentId(thread, idsInStatus);
  };
  const parentId = parentIdOf(threadId);
  const target = reorderTargetId(
    orderedIds,
    orderedIds.filter((id) => parentIdOf(id) === parentId),
    threadId,
    intent.scope,
    intent.direction,
  );
  if (target === null) return { kind: "none" };
  return {
    kind: "order",
    taskStatus,
    ...neighbors(orderedIds, threadId, target.beforeThreadId),
  };
}
