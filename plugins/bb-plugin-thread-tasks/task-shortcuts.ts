import type { ThreadStatus } from "./thread-status";

export interface ShortcutKeyEvent {
  altKey: boolean;
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
  { altKey: false, ctrlKey: true, shiftKey: true, status: "Waiting" },
  { altKey: false, ctrlKey: true, shiftKey: false, status: "Deferred" },
  { altKey: true, ctrlKey: false, shiftKey: false, status: "Canceled" },
];

export function taskStatusShortcut(
  event: ShortcutKeyEvent,
): ThreadStatus | null {
  if (!event.metaKey || event.repeat || event.key !== ".") return null;
  return (
    STATUS_CHORDS.find(
      (chord) =>
        chord.altKey === event.altKey &&
        chord.ctrlKey === event.ctrlKey &&
        chord.shiftKey === event.shiftKey,
    )?.status ?? null
  );
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
