export interface LifecycleActionOptions {
  attempt(): boolean;
  isCurrent(): boolean;
  observe(callback: () => void): () => void;
  signal: AbortSignal;
}

/**
 * Keep attempting an action when its host lifecycle advances. There is no
 * elapsed-time limit: the observer is released only after success, abort, or
 * navigation makes the action obsolete.
 */
export function waitForLifecycleAction({
  attempt,
  isCurrent,
  observe,
  signal,
}: LifecycleActionOptions): () => void {
  if (signal.aborted) return () => {};

  let stopped = false;
  let stopObserving = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    stopObserving();
    signal.removeEventListener("abort", stop);
  };
  const run = () => {
    if (stopped) return;
    if (signal.aborted || !isCurrent() || attempt()) stop();
  };

  signal.addEventListener("abort", stop, { once: true });
  const observedStop = observe(run);
  stopObserving = observedStop;
  if (stopped) observedStop();
  else run();
  return stop;
}
