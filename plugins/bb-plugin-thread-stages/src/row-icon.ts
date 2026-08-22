import type { ProjectIconView } from "./icons";

export interface RowIconOwners {
  /** Sections that carry an icon of their own. Absent means none was set. */
  sections: ReadonlyMap<string, ProjectIconView>;
  projects: ReadonlyMap<string, ProjectIconView>;
}

export interface RowIconThread {
  /**
   * The section the row belongs to. bb attaches a section to a root thread,
   * so a child passes its root's rather than its own, which is null.
   */
  sectionId: string | null;
  projectId: string;
}

/**
 * The icon a sidebar row draws: its section's, or its project's.
 *
 * A section only appears in `sections` once someone has given it an icon —
 * the Icons plugin stores a row on the first pick and deletes it on Remove —
 * so a section left alone falls through to the project, and every row in an
 * untouched sidebar looks exactly as it did before.
 */
export function rowIcon(
  { sectionId, projectId }: RowIconThread,
  { sections, projects }: RowIconOwners,
): ProjectIconView | null {
  const section = sectionId === null ? undefined : sections.get(sectionId);
  return section ?? projects.get(projectId) ?? null;
}
