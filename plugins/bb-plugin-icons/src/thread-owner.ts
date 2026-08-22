import type { IconOwner } from "./store";

interface StoredOwner {
  kind: string;
  id: string;
}

export interface ThreadPlacement {
  /** bb files a section on the root thread, so a child reports its root's. */
  sectionId: string | null;
  projectId: string;
}

/**
 * Whose icon a thread shows: its project's, or its section's.
 *
 * The project is asked first, because that is what a thread belongs to most of
 * the time and what these icons meant before sections had any. A section only
 * answers for a project that has been left alone — the store holds a row from
 * the first pick until Remove deletes it — and where neither has been picked
 * the project answers anyway, so the icon drawn is the project's default. The
 * sidebar row and the header's single icon both read this, so they cannot
 * disagree.
 */
export function threadIconOwner(
  { sectionId, projectId }: ThreadPlacement,
  stored: readonly StoredOwner[],
): IconOwner {
  const has = (kind: string, id: string) =>
    stored.some((icon) => icon.kind === kind && icon.id === id);
  if (has("project", projectId)) return { kind: "project", id: projectId };
  if (sectionId !== null && has("section", sectionId)) {
    return { kind: "section", id: sectionId };
  }
  return { kind: "project", id: projectId };
}
