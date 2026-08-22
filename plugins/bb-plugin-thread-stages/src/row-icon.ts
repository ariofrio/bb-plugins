import type { ProjectIconView } from "./icons";

export interface RowIconOwners {
  /** Every project, carrying its default where nobody has picked one. */
  projects: ReadonlyMap<string, ProjectIconView>;
  /** Only projects someone has picked an icon for. */
  chosenProjects: ReadonlyMap<string, ProjectIconView>;
  /** Only sections someone has picked an icon for. */
  sections: ReadonlyMap<string, ProjectIconView>;
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
 * The icon a sidebar row draws: its project's, or its section's.
 *
 * The project is asked first, because that is what a row meant before sections
 * had icons at all. A section answers only for a project nobody has picked an
 * icon for, and where neither was picked the row falls back to the project's
 * default — so an untouched sidebar looks exactly as it did, and giving a
 * section an icon marks the threads in it without overriding a project someone
 * has already chosen for.
 */
export function rowIcon(
  { sectionId, projectId }: RowIconThread,
  { projects, chosenProjects, sections }: RowIconOwners,
): ProjectIconView | null {
  const chosen = chosenProjects.get(projectId);
  if (chosen !== undefined) return chosen;
  const section = sectionId === null ? undefined : sections.get(sectionId);
  return section ?? projects.get(projectId) ?? null;
}
