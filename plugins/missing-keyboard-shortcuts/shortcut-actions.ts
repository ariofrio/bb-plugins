import { PERSONAL_PROJECT_ID } from "./last-thread-project";

export interface ShortcutKeyEvent {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
}

export interface NewThreadTarget {
  projectId: string;
}

function exactCommandChord(event: ShortcutKeyEvent): boolean {
  return (
    event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.repeat
  );
}

export function historyDirection(event: ShortcutKeyEvent): -1 | 1 | null {
  if (!exactCommandChord(event) || event.shiftKey) {
    return null;
  }

  if (event.key === "[") return -1;
  if (event.key === "]") return 1;
  return null;
}

export function isArchiveShortcut(event: ShortcutKeyEvent): boolean {
  return (
    exactCommandChord(event) &&
    !event.shiftKey &&
    event.key === "."
  );
}

export function isTerminalShortcut(event: ShortcutKeyEvent): boolean {
  return (
    event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.repeat &&
    event.key === "`"
  );
}

export function newThreadTarget(
  event: ShortcutKeyEvent,
  pathname: string,
  lastThreadProjectId: string | null = null,
): NewThreadTarget | null {
  if (!exactCommandChord(event) || event.key.toLowerCase() !== "n") {
    return null;
  }

  if (!event.shiftKey) {
    return { projectId: PERSONAL_PROJECT_ID };
  }

  const route = currentThreadRoute(pathname);
  if (route === null) {
    return { projectId: lastThreadProjectId ?? PERSONAL_PROJECT_ID };
  }
  if (route.projectId === null) {
    return { projectId: PERSONAL_PROJECT_ID };
  }
  return { projectId: route.projectId };
}

interface CurrentThreadRoute {
  projectId: string | null;
  threadId: string;
}

function decodePathSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  try {
    return decodeURIComponent(segment) || null;
  } catch {
    return null;
  }
}

function currentThreadRoute(pathname: string): CurrentThreadRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "threads") {
    const threadId = decodePathSegment(segments[1]);
    return threadId === null ? null : { projectId: null, threadId };
  }
  if (
    segments.length === 4 &&
    segments[0] === "projects" &&
    segments[2] === "threads"
  ) {
    const projectId = decodePathSegment(segments[1]);
    const threadId = decodePathSegment(segments[3]);
    return projectId === null || threadId === null
      ? null
      : { projectId, threadId };
  }
  return null;
}

export function currentThreadId(pathname: string): string | null {
  return currentThreadRoute(pathname)?.threadId ?? null;
}
