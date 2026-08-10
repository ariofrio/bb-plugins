export type PanelTabIcon = "SideChat" | "Terminal";

export interface PanelTabButton {
  click(): void;
  hasIcon(icon: PanelTabIcon): boolean;
}

export interface PanelTabRoot {
  panelTabButtons(): readonly PanelTabButton[];
}

export interface PanelTabObserver {
  disconnect(): void;
  observe(): void;
}

interface SelectPanelTabWhenReadyOptions {
  createObserver(callback: () => void): PanelTabObserver;
  icon: PanelTabIcon;
  index(): number;
  isCurrent(): boolean;
  root: PanelTabRoot;
  signal: AbortSignal;
}

export function selectPanelTabWhenReady({
  createObserver,
  icon,
  index,
  isCurrent,
  root,
  signal,
}: SelectPanelTabWhenReadyOptions): () => void {
  if (signal.aborted) return () => {};

  let stopped = false;
  let observer: PanelTabObserver | null = null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    signal.removeEventListener("abort", stop);
  };
  const attempt = () => {
    if (stopped) return;
    if (!isCurrent()) {
      stop();
      return;
    }
    const targetIndex = index();
    if (targetIndex < 0) return;
    const tab = root
      .panelTabButtons()
      .filter((button) => button.hasIcon(icon))[targetIndex];
    if (tab === undefined) return;
    tab.click();
    stop();
  };
  observer = createObserver(attempt);
  signal.addEventListener("abort", stop, { once: true });
  observer.observe();
  attempt();
  return stop;
}
