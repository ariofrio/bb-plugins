/**
 * Leaves the window bb watches before touching the DOM.
 *
 * bb blocks a React-owned node from entering a container React does not own
 * while any plugin is attributed on its stack, and it keeps that attribution
 * across `setTimeout` and `queueMicrotask` — both are patched to re-enter the
 * plugin's context, so neither escapes. `requestAnimationFrame` is left
 * native, so a frame callback runs unattributed and the insert is allowed.
 */
export function afterPluginFrame(run: () => void): () => void {
  if (typeof requestAnimationFrame !== "function") {
    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }
  const frame = requestAnimationFrame(() => run());
  return () => cancelAnimationFrame(frame);
}
