interface ProjectReference {
  id: string;
}

interface ProjectThread {
  projectId: string;
}

export function normalizeProjectFilter(
  projectId: string | null,
  projects: readonly ProjectReference[],
): string | null {
  if (projectId === null) return null;
  return projects.some((project) => project.id === projectId)
    ? projectId
    : null;
}

export function filterThreadsByProject<T extends ProjectThread>(
  threads: readonly T[],
  projectId: string | null,
): readonly T[] {
  if (projectId === null) return threads;
  return threads.filter((thread) => thread.projectId === projectId);
}
