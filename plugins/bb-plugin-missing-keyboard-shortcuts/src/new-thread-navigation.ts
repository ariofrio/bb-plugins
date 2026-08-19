export interface NewThreadHost {
  getSelectedProjectId(): string | null;
  selectProject(projectId: string): void;
  notifyProjectChanged(
    oldProjectId: string | null,
    newProjectId: string,
  ): void;
  openComposer(): void;
}

export function openNewThread(
  host: NewThreadHost,
  projectId: string,
): void {
  const oldProjectId = host.getSelectedProjectId();
  host.selectProject(projectId);
  host.notifyProjectChanged(oldProjectId, projectId);
  host.openComposer();
}
