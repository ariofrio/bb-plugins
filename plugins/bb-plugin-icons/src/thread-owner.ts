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
 * Whose icon a thread shows: its section's, or its project's.
 *
 * A section owns the icon only once someone has given it one. The store holds
 * a row from the first pick until Remove deletes it, so an untouched section
 * hands the thread back to its project and nothing changes for anyone who has
 * not asked for it. The sidebar row and the header's single icon both read
 * this, so they cannot disagree.
 */
export function threadIconOwner(
  { sectionId, projectId }: ThreadPlacement,
  stored: readonly StoredOwner[],
): IconOwner {
  const hasSectionIcon =
    sectionId !== null &&
    stored.some((icon) => icon.kind === "section" && icon.id === sectionId);
  return hasSectionIcon
    ? { kind: "section", id: sectionId }
    : { kind: "project", id: projectId };
}
