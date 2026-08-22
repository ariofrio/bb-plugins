// @vitest-environment jsdom
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCrumbRoot } from "./crumb-root";

/**
 * bb's foreign-DOM mutation guard, reduced to the two halves a plugin can
 * observe, so a test can draw the crumbs in the window they fail in.
 *
 * The real guard refuses to move a React-owned node into a container React does
 * not own while a plugin is attributed on bb's stack, and separately suppresses
 * a `removeChild` for a node that is no longer where React left it. Both halves
 * matter here: the refusal is what leaves the crumbs undrawn, and the
 * suppression is what a second attempt runs into when React deletes the subtree
 * it believes it placed. React ownership is read the way bb reads it, from an
 * own property named for one of React's internal instance keys — which a root
 * container, marked only `__reactContainer$`, does not carry.
 */
const REACT_INSTANCE_KEYS = ["__reactFiber$", "__reactInternalInstance$"];

function isReactOwned(node: Node): boolean {
  return Object.getOwnPropertyNames(node).some((name) =>
    REACT_INSTANCE_KEYS.some((key) => name.startsWith(key)),
  );
}

/** Says of a node what bb says of the slot it hands a plugin: React put it there. */
function markReactOwned(node: Node): void {
  Object.defineProperty(node, "__reactFiber$test", { value: {} });
}

interface ForeignDomGuard {
  /** While set, an insert of a React node into a foreign container is refused. */
  attributed: boolean;
  readonly refused: number;
  restore(): void;
}

function installForeignDomGuard(): ForeignDomGuard {
  const appendChild = Node.prototype.appendChild;
  const insertBefore = Node.prototype.insertBefore;
  const removeChild = Node.prototype.removeChild;
  let refused = 0;

  const refuses = (node: Node, parent: Node) =>
    guard.attributed &&
    node.parentNode !== parent &&
    isReactOwned(node) &&
    !(node.parentNode === null && isReactOwned(parent));

  const guard: ForeignDomGuard = {
    attributed: false,
    get refused() {
      return refused;
    },
    restore() {
      Node.prototype.appendChild = appendChild;
      Node.prototype.insertBefore = insertBefore;
      Node.prototype.removeChild = removeChild;
    },
  };

  Node.prototype.appendChild = function (this: Node, node: Node) {
    if (refuses(node, this)) {
      refused += 1;
      return node;
    }
    return appendChild.call(this, node);
  } as typeof Node.prototype.appendChild;
  Node.prototype.insertBefore = function (
    this: Node,
    node: Node,
    child: Node | null,
  ) {
    if (refuses(node, this)) {
      refused += 1;
      return node;
    }
    return insertBefore.call(this, node, child);
  } as typeof Node.prototype.insertBefore;
  Node.prototype.removeChild = function (this: Node, node: Node) {
    if (node.parentNode !== this) return node;
    return removeChild.call(this, node);
  } as typeof Node.prototype.removeChild;

  return guard;
}

describe("createCrumbRoot", () => {
  let guard: ForeignDomGuard;

  beforeEach(() => {
    document.body.innerHTML = "";
    guard = installForeignDomGuard();
  });

  afterEach(() => {
    guard.restore();
    vi.useRealTimers();
  });

  function scheduler() {
    const frames: Array<() => void> = [];
    return {
      schedule(run: () => void) {
        frames.push(run);
        return () => {
          const index = frames.indexOf(run);
          if (index !== -1) frames.splice(index, 1);
        };
      },
      runFrames() {
        const pending = frames.splice(0, frames.length);
        for (const run of pending) run();
        return pending.length;
      },
    };
  }

  function container() {
    const node = document.createElement("span");
    document.body.append(node);
    return node;
  }

  it("draws only what the last render asked for, on one frame", () => {
    const frames = scheduler();
    const target = container();
    const root = createCrumbRoot(target, { schedule: frames.schedule });

    root.render(createElement("button", null, "first"));
    root.render(createElement("button", null, "second"));
    expect(frames.runFrames()).toBe(1);

    expect(target.textContent).toBe("second");
    root.dispose();
  });

  it("keeps offering the crumbs until bb stops refusing them", () => {
    vi.useFakeTimers();
    const frames = scheduler();
    const target = container();
    const root = createCrumbRoot(target, {
      schedule: frames.schedule,
      retryDelayMs: 100,
    });

    guard.attributed = true;
    root.render(createElement("button", null, "Storefront"));
    frames.runFrames();
    // React committed a tree it believes is on screen; bb dropped the insert.
    expect(guard.refused).toBeGreaterThan(0);
    expect(target.childElementCount).toBe(0);

    vi.advanceTimersByTime(100);
    frames.runFrames();
    expect(target.childElementCount).toBe(0);

    guard.attributed = false;
    vi.advanceTimersByTime(100);
    frames.runFrames();

    expect(target.textContent).toBe("Storefront");
    root.dispose();
  });

  it("stops offering once the window it was given runs out", () => {
    vi.useFakeTimers();
    const frames = scheduler();
    const target = container();
    const root = createCrumbRoot(target, {
      schedule: frames.schedule,
      retryDelayMs: 100,
      giveUpAfterMs: 300,
    });

    guard.attributed = true;
    root.render(createElement("button", null, "Storefront"));
    for (let tick = 0; tick < 10; tick += 1) {
      frames.runFrames();
      vi.advanceTimersByTime(100);
    }

    frames.runFrames();
    expect(frames.runFrames()).toBe(0);
    root.dispose();
  });
});

describe("the crumbs under bb's foreign-DOM guard", () => {
  let guard: ForeignDomGuard;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    guard = installForeignDomGuard();
  });

  afterEach(() => {
    guard.restore();
    document.body.innerHTML = "";
  });

  it("arrive once another plugin lets go of bb's stack", async () => {
    document.body.innerHTML = `
      <header>
        <div><div><p>Thread title</p></div><span data-testid="thread-detail-header-actions-menu"></span></div>
        <span id="slot-wrapper" role="group"></span>
      </header>
    `;
    const app = await loadPluginApp(() => import("./app"));
    const wrapper = document.querySelector("#slot-wrapper")!;
    const slot = renderSlot(
      app.threadHeaderActions[0]!,
      { threadId: "thread-1", projectId: "project-1", isCompactViewport: false },
      {
        rpc: {
          trailForThread: () => ({
            section: null,
            project: { id: "project-1", name: "Example project", isPersonal: false },
            ancestors: [],
          }),
        },
        sidebarThreads: { projects: [], threads: [] },
      },
    );
    // bb hands a plugin a slot inside its own tree, so React owns it; only the
    // container the plugin installs in the header is foreign.
    markReactOwned(slot.container);
    wrapper.append(slot.container);

    // Another plugin's content script is awaiting its backend, so bb holds the
    // whole app attributed and refuses every foreign insert in the meantime.
    guard.attributed = true;
    const root = await waitFor(() => {
      const found = document.querySelector("[data-breadcrumbs-root]");
      expect(found).not.toBeNull();
      return found!;
    });
    await waitFor(() => expect(guard.refused).toBeGreaterThan(0));
    expect(root.childElementCount).toBe(0);

    guard.attributed = false;

    await waitFor(
      () =>
        expect(
          root.querySelector('[aria-label="Example project actions"]'),
        ).not.toBeNull(),
      { timeout: 5000 },
    );
    slot.lifecycle.unmount();
  });
});
