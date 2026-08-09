type OpenComposer = () => void;
type FocusComposer = () => void;

const openComposers: OpenComposer[] = [];
const primaryComposerFocusByThread = new Map<string, FocusComposer[]>();

export function registerOpenComposer(openComposer: OpenComposer): () => void {
  openComposers.push(openComposer);
  return () => {
    const index = openComposers.lastIndexOf(openComposer);
    if (index !== -1) openComposers.splice(index, 1);
  };
}

export function hasOpenComposer(): boolean {
  return openComposers.length > 0;
}

export function openRegisteredComposer(): boolean {
  const openComposer = openComposers.at(-1);
  if (openComposer === undefined) return false;
  openComposer();
  return true;
}

export function registerPrimaryComposerFocus(
  threadId: string,
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

export function focusPrimaryComposer(threadId: string): boolean {
  const focusComposer = primaryComposerFocusByThread.get(threadId)?.at(-1);
  if (focusComposer === undefined) return false;
  focusComposer();
  return true;
}
