import { Fragment, createElement, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterPluginFrame } from "./after-plugin-frame";

/**
 * The React root the crumbs are drawn in, which keeps offering them until bb
 * accepts them.
 *
 * bb guards its React tree: while a plugin is attributed on its stack it
 * refuses to move a React-owned node into a container React does not own, and
 * a container React only knows as a root — ours carries `__reactContainer$`,
 * not the `__reactFiber$` the guard looks for — is such a container. The
 * refusal is silent: `appendChild` returns, nothing is inserted, React commits
 * a tree it believes is on screen and never offers it again.
 *
 * Leaving bb's stack is not enough to get out of that window. bb holds a
 * plugin attributed across `await`, so while any other plugin's content script
 * is waiting on its own backend — a second or so on a cold start, up to bb's
 * ten-second mount timeout — every plugin in the window is refused, whichever
 * frame, timeout, or microtask it draws from. So the crumbs are offered again
 * on a later frame instead, under a key that makes React mount them afresh
 * rather than update a subtree it already believes it placed.
 */
export interface CrumbRoot {
  /**
   * Draws `element`, on a frame of its own, and again later if bb refused it.
   *
   * The element must draw at least one element of its own: a container still
   * empty after the commit is how a refusal is recognized.
   */
  render(element: ReactNode): void;
  /** Stops drawing and unmounts, off the commit this is called from. */
  dispose(): void;
}

export interface CrumbRootOptions {
  /** Defaults to {@link afterPluginFrame}. */
  schedule?: (run: () => void) => () => void;
  /** How long to leave between offers. */
  retryDelayMs?: number;
  /** How long to keep offering before letting the header stand bare. */
  giveUpAfterMs?: number;
  /** The clock that window is measured on. */
  now?: () => number;
}

export function createCrumbRoot(
  container: HTMLElement,
  options: CrumbRootOptions = {},
): CrumbRoot {
  const schedule = options.schedule ?? afterPluginFrame;
  // Long enough that a contended start is not spent re-rendering, short enough
  // that the crumbs arrive within a frame or two of the window closing.
  const retryDelayMs = options.retryDelayMs ?? 100;
  // Comfortably past bb's own ten-second content-script mount timeout, which
  // is the longest window a plugin can hold the whole app attributed for.
  const giveUpAfterMs = options.giveUpAfterMs ?? 30_000;
  const now = options.now ?? (() => Date.now());

  let root: Root | null = null;
  let element: ReactNode = null;
  let cancelFrame: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let refusedSince: number | null = null;
  let disposed = false;

  const draw = () => {
    // A draw already on its way carries whatever `element` holds by the time
    // it runs, so a re-render adds nothing but never cancels one either.
    if (disposed || cancelFrame !== null || retry !== null) return;
    cancelFrame = schedule(() => {
      cancelFrame = null;
      if (disposed) return;
      root ??= createRoot(container);
      const current = root;
      // Synchronously, so what the DOM made of the crumbs can be read here
      // rather than guessed at a frame later.
      flushSync(() => {
        current.render(createElement(Fragment, { key: attempt }, element));
      });
      if (container.childElementCount > 0) {
        refusedSince = null;
        return;
      }
      refusedSince ??= now();
      if (now() - refusedSince >= giveUpAfterMs) return;
      attempt += 1;
      retry = setTimeout(() => {
        retry = null;
        draw();
      }, retryDelayMs);
    });
  };

  return {
    render(next) {
      element = next;
      draw();
    },
    dispose() {
      disposed = true;
      cancelFrame?.();
      cancelFrame = null;
      if (retry !== null) clearTimeout(retry);
      retry = null;
      const current = root;
      root = null;
      // Unmounting during a commit is what React warns about, so it waits.
      if (current !== null) schedule(() => current.unmount());
    },
  };
}
