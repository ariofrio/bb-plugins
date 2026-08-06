export interface ShortcutKeyEvent {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
}

export function historyDirection(event: ShortcutKeyEvent): -1 | 1 | null {
  if (
    !event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.repeat
  ) {
    return null;
  }

  if (event.key === "[") return -1;
  if (event.key === "]") return 1;
  return null;
}

export function isArchiveShortcut(event: ShortcutKeyEvent): boolean {
  return (
    event.metaKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.repeat &&
    event.key.toLowerCase() === "a"
  );
}

export function currentThreadId(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const threadsIndex = segments.lastIndexOf("threads");
  if (threadsIndex < 0 || threadsIndex !== segments.length - 2) return null;

  try {
    return decodeURIComponent(segments[segments.length - 1] ?? "") || null;
  } catch {
    return null;
  }
}
