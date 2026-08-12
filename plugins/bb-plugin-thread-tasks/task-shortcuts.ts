import type { ThreadStatus } from "./thread-status";

export interface ShortcutKeyEvent {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
}

interface StatusChord {
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  status: ThreadStatus;
}

// Working is missing on purpose: the task workflow assigns it automatically.
const STATUS_CHORDS: readonly StatusChord[] = [
  { altKey: false, ctrlKey: false, shiftKey: false, status: "Done" },
  { altKey: false, ctrlKey: false, shiftKey: true, status: "To do" },
  { altKey: false, ctrlKey: true, shiftKey: true, status: "Blocked" },
  { altKey: false, ctrlKey: true, shiftKey: false, status: "Backlog" },
  { altKey: true, ctrlKey: false, shiftKey: false, status: "Canceled" },
];

export function taskStatusShortcut(
  event: ShortcutKeyEvent,
): ThreadStatus | null {
  if (!event.metaKey || event.repeat || event.code !== "Period") return null;
  return (
    STATUS_CHORDS.find(
      (chord) =>
        chord.altKey === event.altKey &&
        chord.ctrlKey === event.ctrlKey &&
        chord.shiftKey === event.shiftKey,
    )?.status ?? null
  );
}

export type ReorderScope = "step" | "edge" | "status";

export interface ReorderIntent {
  scope: ReorderScope;
  direction: -1 | 1;
}

export function taskReorderShortcut(
  event: ShortcutKeyEvent,
): ReorderIntent | null {
  if (!event.metaKey || event.repeat) return null;
  const direction =
    event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : null;
  if (direction === null) return null;
  if (event.altKey && !event.ctrlKey) {
    return { scope: event.shiftKey ? "edge" : "step", direction };
  }
  if (event.ctrlKey && !event.altKey && !event.shiftKey) {
    return { scope: "status", direction };
  }
  return null;
}

/**
 * Resolves the thread a move should insert its task before, in the same terms
 * the drag handlers use: `null` places the task last, and a `null` result
 * leaves the task where it is. `orderedIds` is the whole status in stored
 * order; `siblingIds` is the subset rendered at the task's own depth.
 */
export function reorderTargetId(
  orderedIds: readonly string[],
  siblingIds: readonly string[],
  threadId: string,
  scope: "step" | "edge",
  direction: -1 | 1,
): { beforeThreadId: string | null } | null {
  const index = siblingIds.indexOf(threadId);
  if (index === -1) return null;

  if (direction === -1) {
    if (index === 0) return null;
    return {
      beforeThreadId: (scope === "edge" ? siblingIds[0] : siblingIds[index - 1]) ?? null,
    };
  }

  if (index === siblingIds.length - 1) return null;
  const anchorIndex = scope === "edge" ? siblingIds.length - 1 : index + 1;
  const nextSibling = siblingIds[anchorIndex + 1];
  if (nextSibling !== undefined) return { beforeThreadId: nextSibling };
  const anchorId = siblingIds[anchorIndex];
  const anchorPosition =
    anchorId === undefined ? -1 : orderedIds.indexOf(anchorId);
  return {
    beforeThreadId:
      anchorPosition === -1 ? null : (orderedIds[anchorPosition + 1] ?? null),
  };
}

function decodePathSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  try {
    return decodeURIComponent(segment) || null;
  } catch {
    return null;
  }
}

export function currentThreadId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "threads") {
    return decodePathSegment(segments[1]);
  }
  if (
    segments.length === 4 &&
    segments[0] === "projects" &&
    segments[2] === "threads"
  ) {
    return decodePathSegment(segments[3]);
  }
  return null;
}
