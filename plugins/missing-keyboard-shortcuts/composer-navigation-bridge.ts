type FocusComposer = () => void;
type ArchiveThread = () => void;

interface SecondaryComposerRegistration {
  focus: FocusComposer;
  isFocused: () => boolean;
  isVisible: () => boolean;
}

const primaryComposerFocusByThread = new Map<string | null, FocusComposer[]>();
const archiveThreadByThread = new Map<string, ArchiveThread[]>();
const secondaryComposersByParent = new Map<
  string,
  Map<string, SecondaryComposerRegistration[]>
>();
const secondaryComposerReadyListeners = new Map<
  string,
  Map<string, Set<() => void>>
>();

export function registerThreadArchive(
  threadId: string,
  archiveThread: ArchiveThread,
): () => void {
  const actions = archiveThreadByThread.get(threadId) ?? [];
  actions.push(archiveThread);
  archiveThreadByThread.set(threadId, actions);
  return () => {
    const index = actions.lastIndexOf(archiveThread);
    if (index !== -1) actions.splice(index, 1);
    if (
      actions.length === 0 &&
      archiveThreadByThread.get(threadId) === actions
    ) {
      archiveThreadByThread.delete(threadId);
    }
  };
}

export function archiveRegisteredThread(threadId: string): boolean {
  const archiveThread = archiveThreadByThread.get(threadId)?.at(-1);
  if (archiveThread === undefined) return false;
  archiveThread();
  return true;
}

export function registerPrimaryComposerFocus(
  threadId: string | null,
  focusComposer: FocusComposer,
): () => void {
  const focusComposers = primaryComposerFocusByThread.get(threadId) ?? [];
  focusComposers.push(focusComposer);
  primaryComposerFocusByThread.set(threadId, focusComposers);
  return () => {
    const index = focusComposers.lastIndexOf(focusComposer);
    if (index !== -1) focusComposers.splice(index, 1);
    if (
      focusComposers.length === 0 &&
      primaryComposerFocusByThread.get(threadId) === focusComposers
    ) {
      primaryComposerFocusByThread.delete(threadId);
    }
  };
}

export function hasPrimaryComposer(threadId: string | null): boolean {
  return (primaryComposerFocusByThread.get(threadId)?.length ?? 0) > 0;
}

export function focusPrimaryComposer(threadId: string | null): boolean {
  const focusComposer = primaryComposerFocusByThread.get(threadId)?.at(-1);
  if (focusComposer === undefined) return false;
  focusComposer();
  return true;
}

export function registerSecondaryComposer(
  parentThreadId: string,
  childThreadId: string,
  registration: SecondaryComposerRegistration,
): () => void {
  let byChild = secondaryComposersByParent.get(parentThreadId);
  if (byChild === undefined) {
    byChild = new Map();
    secondaryComposersByParent.set(parentThreadId, byChild);
  }
  const registrations = byChild.get(childThreadId) ?? [];
  registrations.push(registration);
  byChild.set(childThreadId, registrations);
  for (const listener of secondaryComposerReadyListeners
    .get(parentThreadId)
    ?.get(childThreadId) ?? []) {
    listener();
  }
  return () => {
    const index = registrations.lastIndexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
    if (registrations.length === 0) byChild?.delete(childThreadId);
    if (byChild?.size === 0) secondaryComposersByParent.delete(parentThreadId);
  };
}

export function focusSecondaryComposer(
  parentThreadId: string,
  childThreadId: string,
): boolean {
  const registrations = secondaryComposersByParent
    .get(parentThreadId)
    ?.get(childThreadId);
  if (registrations === undefined) return false;
  for (let index = registrations.length - 1; index >= 0; index -= 1) {
    const registration = registrations[index];
    if (registration?.isVisible()) {
      registration.focus();
      return registration.isFocused();
    }
  }
  return false;
}

interface FocusSecondaryComposerWhenReadyOptions {
  isCurrent(): boolean;
  signal: AbortSignal;
}

export function focusSecondaryComposerWhenReady(
  parentThreadId: string,
  childThreadId: string,
  { isCurrent, signal }: FocusSecondaryComposerWhenReadyOptions,
): () => void {
  if (signal.aborted) return () => {};

  let byChild = secondaryComposerReadyListeners.get(parentThreadId);
  if (byChild === undefined) {
    byChild = new Map();
    secondaryComposerReadyListeners.set(parentThreadId, byChild);
  }
  const listeners = byChild.get(childThreadId) ?? new Set<() => void>();
  byChild.set(childThreadId, listeners);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    listeners.delete(attempt);
    if (listeners.size === 0) byChild?.delete(childThreadId);
    if (byChild?.size === 0) {
      secondaryComposerReadyListeners.delete(parentThreadId);
    }
    signal.removeEventListener("abort", stop);
  };
  const attempt = () => {
    if (stopped) return;
    if (
      !isCurrent() ||
      focusSecondaryComposer(parentThreadId, childThreadId)
    ) {
      stop();
    }
  };
  listeners.add(attempt);
  signal.addEventListener("abort", stop, { once: true });
  attempt();
  return stop;
}

export function isSecondaryComposerFocused(
  parentThreadId: string,
  childThreadId: string,
): boolean {
  return (
    secondaryComposersByParent
      .get(parentThreadId)
      ?.get(childThreadId)
      ?.some(({ isFocused }) => isFocused()) ?? false
  );
}

export function focusedSecondaryComposerThreadId(
  parentThreadId: string,
): string | null {
  const byChild = secondaryComposersByParent.get(parentThreadId);
  if (byChild === undefined) return null;
  for (const [childThreadId, registrations] of byChild) {
    if (registrations.some(({ isFocused }) => isFocused())) {
      return childThreadId;
    }
  }
  return null;
}
