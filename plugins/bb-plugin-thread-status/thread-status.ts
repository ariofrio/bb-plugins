export const THREAD_STATUSES = [
  "Done",
  "To Do",
  "Working",
  "Waiting",
  "Deferred",
  "Canceled",
] as const;

export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export interface ThreadAssignment {
  threadId: string;
  status: ThreadStatus;
  position: number;
  updatedAt: number;
}

export interface SidebarThreadLike {
  id: string;
  updatedAt: number;
}

export const DEFAULT_THREAD_STATUS: ThreadStatus = "To Do";

function statusKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const STATUS_BY_KEY = new Map<string, ThreadStatus>(
  THREAD_STATUSES.flatMap((status) => {
    const entries: Array<[string, ThreadStatus]> = [[statusKey(status), status]];
    if (status === "Canceled") entries.push(["cancelled", status]);
    return entries;
  }),
);

export function parseThreadStatus(value: string): ThreadStatus | null {
  return STATUS_BY_KEY.get(statusKey(value)) ?? null;
}

export function groupThreadsByStatus<Thread extends SidebarThreadLike>(
  threads: readonly Thread[],
  assignments: readonly ThreadAssignment[],
): Record<ThreadStatus, Thread[]> {
  const assignmentByThread = new Map(
    assignments.map((assignment) => [assignment.threadId, assignment]),
  );
  const sourceIndex = new Map(threads.map((thread, index) => [thread.id, index]));
  const groups: Record<ThreadStatus, Thread[]> = {
    Done: [],
    "To Do": [],
    Working: [],
    Waiting: [],
    Deferred: [],
    Canceled: [],
  };

  for (const thread of threads) {
    const status = assignmentByThread.get(thread.id)?.status ?? DEFAULT_THREAD_STATUS;
    groups[status].push(thread);
  }

  for (const status of THREAD_STATUSES) {
    groups[status].sort((left, right) => {
      const leftAssignment = assignmentByThread.get(left.id);
      const rightAssignment = assignmentByThread.get(right.id);
      if (leftAssignment && rightAssignment) {
        return (
          leftAssignment.position - rightAssignment.position ||
          (sourceIndex.get(left.id) ?? 0) - (sourceIndex.get(right.id) ?? 0)
        );
      }
      if (leftAssignment) return -1;
      if (rightAssignment) return 1;
      return (sourceIndex.get(left.id) ?? 0) - (sourceIndex.get(right.id) ?? 0);
    });
  }

  return groups;
}

export function destinationOrder(
  currentThreadIds: readonly string[],
  movingThreadId: string,
  beforeThreadId: string | null,
): string[] {
  const withoutMoving = currentThreadIds.filter((id) => id !== movingThreadId);
  const insertionIndex =
    beforeThreadId === null ? -1 : withoutMoving.indexOf(beforeThreadId);
  const next = [...withoutMoving];
  next.splice(insertionIndex < 0 ? next.length : insertionIndex, 0, movingThreadId);
  return next;
}
