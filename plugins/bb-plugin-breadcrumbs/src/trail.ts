/** The thread fields a trail needs, as `experimental_useSidebarThreads` reports them. */
export interface TrailThread {
  id: string;
  parentThreadId: string | null;
  title: string | null;
  titleFallback: string | null;
  sectionId: string | null;
}

export interface Crumb {
  id: string;
  title: string;
  sectionId: string | null;
}

/** What bb shows for a thread that has not named itself yet. */
function label(thread: TrailThread): string {
  const named = thread.title ?? thread.titleFallback ?? "";
  return named.trim() === "" ? "Untitled" : named;
}

function walk(
  threads: readonly TrailThread[],
  threadId: string,
): TrailThread[] {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const trail: TrailThread[] = [];
  const seen = new Set<string>();
  let current = byId.get(threadId);
  // A parent bb has not sent yet, or a cycle, must never spin the header.
  while (current !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift(current);
    current =
      current.parentThreadId === null
        ? undefined
        : byId.get(current.parentThreadId);
  }
  return trail;
}

/**
 * The thread at the top of this one's family.
 *
 * Sections attach to root threads — a child inherits its root's placement and
 * carries no `sectionId` of its own — so the section crumb resolves from here
 * rather than from the thread in view.
 */
export function rootOf(
  threads: readonly TrailThread[],
  threadId: string,
): TrailThread | null {
  return walk(threads, threadId)[0] ?? null;
}

/** Every thread above this one, oldest first, excluding itself. */
export function ancestorsOf(
  threads: readonly TrailThread[],
  threadId: string,
): Crumb[] {
  return walk(threads, threadId)
    .slice(0, -1)
    .map((thread) => ({
      id: thread.id,
      title: label(thread),
      sectionId: thread.sectionId,
    }));
}
