export const PERSONAL_PROJECT_ID = "proj_personal";

export const LAST_THREAD_PROJECT_ID_STORAGE_KEY =
  "bb.missing-keyboard-shortcuts.last-thread-project-id";

interface ThreadContext {
  projectId: string | null;
  threadId: string | null;
}

export function rememberThreadProject(
  storage: Pick<Storage, "setItem">,
  context: ThreadContext,
): void {
  if (context.threadId === null) return;
  storage.setItem(
    LAST_THREAD_PROJECT_ID_STORAGE_KEY,
    context.projectId ?? PERSONAL_PROJECT_ID,
  );
}

export function readLastThreadProjectId(
  storage: Pick<Storage, "getItem">,
): string | null {
  const projectId = storage.getItem(LAST_THREAD_PROJECT_ID_STORAGE_KEY);
  return projectId && projectId.length > 0 ? projectId : null;
}
