/**
 * Draws on the next frame, off whatever call bb is watching.
 *
 * bb blocks a React-owned node from entering a container React does not own
 * while a plugin is attributed on its stack, and it keeps that attribution
 * across `setTimeout` and `queueMicrotask` — both are patched to re-enter the
 * plugin's context. `requestAnimationFrame` is left native, so a frame
 * callback at least carries nobody else's plugin into the DOM with it.
 *
 * It does not leave the window, though: bb holds a plugin attributed across
 * `await` as well, so a frame that lands inside another plugin's content-script
 * mount is refused like any other, whoever scheduled it.
 */
export function afterPluginFrame(run: () => void): () => void {
  if (typeof requestAnimationFrame !== "function") {
    const timer = setTimeout(run, 0);
    return () => clearTimeout(timer);
  }
  const frame = requestAnimationFrame(() => run());
  return () => cancelAnimationFrame(frame);
}
