type OpenComposer = () => void;

const openComposers: OpenComposer[] = [];

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
