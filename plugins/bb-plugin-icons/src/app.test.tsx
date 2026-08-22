// @vitest-environment jsdom
import { CircleIcon } from "@hugeicons/core-free-icons";
import {
  loadPluginApp,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
import { cleanup, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  const styles = document.createElement("style");
  styles.dataset.cursorTestStyles = "";
  styles.textContent = `
    .cursor-pointer { cursor: pointer; }
    .size-7 { width: 28px; height: 28px; }
  `;
  document.head.append(styles);
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.head.querySelector("[data-cursor-test-styles]")?.remove();
});

describe("project icon app registration", () => {
  it("registers one thread-header action through the plugin app contract", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.threadHeaderActions).toHaveLength(1);
    expect(app.threadHeaderActions[0]).toMatchObject({
      id: "project-icon",
      title: "Project icon",
    });
  });

  it("matches the standard header control size and cursor", async () => {
    document.body.innerHTML = `
      <header>
        <div>
          <div><p>Thread title</p></div>
          <span id="slot-wrapper" role="group"></span>
          <button data-testid="thread-detail-header-actions-menu"></button>
        </div>
      </header>
    `;
    const app = await loadPluginApp(() => import("./app"));
    const action = app.threadHeaderActions[0]!;
    const wrapper = document.querySelector("#slot-wrapper")!;
    const slot = renderSlot(
      action,
      {
        threadId: "thread-1",
        projectId: "missing-project",
        isCompactViewport: false,
      },
      {
        rpc: {
          listIcons: () => ({
            icons: [],
            defaults: { project: CircleIcon, personal: CircleIcon, section: CircleIcon },
          }),
        },
        sidebarThreads: {
          projects: [
            { id: "project-1", name: "Example project", isPersonal: false },
          ],
        },
      },
    );
    wrapper.append(slot.container);
    slot.lifecycle.rerender(
      createElement(action.component, {
        threadId: "thread-1",
        projectId: "project-1",
        isCompactViewport: false,
      }),
    );

    const trigger = await screen.findByRole("button", {
      name: "Icon for Example project",
    });
    const style = getComputedStyle(trigger);
    expect(style.cursor).toBe("pointer");
    expect(style.width).toBe("28px");
    expect(style.height).toBe("28px");
    slot.lifecycle.unmount();
  });
});

describe("sidebar icon registration", () => {
  it("registers the content script that draws bb's own group headers", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.contentScripts.map(({ id }) => id)).toEqual(["sidebar-icons"]);
  });
});

describe("the window the sidebar script leaves open", () => {
  const originalFetch = globalThis.fetch;
  // Every mount leaves a MutationObserver watching the document, so one left
  // running would place an anchor in the next test's sidebar.
  const mounted: Array<{ controller: AbortController; result: unknown }> = [];
  // A mount left waiting on an answer never resolves, so teardown answers
  // first and only then waits for what it returned.
  const unanswered: Array<(showInSidebar: boolean) => void> = [];

  afterEach(async () => {
    for (const answer of unanswered.splice(0)) answer(false);
    for (const { controller, result } of mounted.splice(0)) {
      controller.abort();
      const dispose = await result;
      if (typeof dispose === "function") dispose();
    }
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
  });

  /** A `listPlacements` that answers only when the test says so. */
  function pendingPlacements() {
    let answer!: (showInSidebar: boolean) => void;
    const settled = new Promise<{ showInSidebar: boolean }>((resolve) => {
      answer = (showInSidebar) => resolve({ showInSidebar });
    });
    unanswered.push(answer);
    globalThis.fetch = vi.fn(async () => {
      const placements = await settled;
      return new Response(
        JSON.stringify({
          ok: true,
          result: { showInThreadHeader: true, showInSidebar: placements.showInSidebar },
        }),
        { headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    // The fetch, its body, the caller resuming, and the observer's first read
    // are each a turn of their own.
    const settle = async (showInSidebar: boolean) => {
      answer(showInSidebar);
      for (let turn = 0; turn < 5; turn += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };
    return { settle };
  }

  function sidebarFixture() {
    document.body.innerHTML = `
      <div data-sidebar-project-id="proj_1">
        <div data-sidebar="group-label"><span><span title="Storefront">Storefront</span></span></div>
      </div>
    `;
  }

  async function mountSidebarScript() {
    const app = await loadPluginApp(() => import("./app"));
    const script = app.contentScripts[0]!;
    const controller = new AbortController();
    const result = script.mount({
      pluginId: "icons",
      generation: 1,
      signal: controller.signal,
    });
    mounted.push({ controller, result });
    return { result, controller };
  }

  it("hands bb a disposer before it asks its backend anything", async () => {
    sidebarFixture();
    const placements = pendingPlacements();

    const { result } = await mountSidebarScript();

    // bb holds a plugin attributed until `mount` settles, and every plugin's
    // portal is refused for as long as it does. Answering with the disposer
    // rather than a promise is what keeps that window shut.
    expect(typeof result).toBe("function");
    await placements.settle(true);
  });

  it("still asks before it places an anchor in bb's sidebar", async () => {
    sidebarFixture();
    const placements = pendingPlacements();

    await mountSidebarScript();

    // An anchor left in bb's group label spaces it out even with nothing drawn
    // in it, so nothing is placed until the answer arrives.
    expect(document.querySelector("[data-icons-sidebar-root]")).toBeNull();
    await placements.settle(true);
    expect(document.querySelector("[data-icons-sidebar-root]")).not.toBeNull();
  });

  it("places nothing when the answer says the sidebar is off", async () => {
    sidebarFixture();
    const placements = pendingPlacements();

    await mountSidebarScript();
    await placements.settle(false);

    expect(document.querySelector("[data-icons-sidebar-root]")).toBeNull();
  });

  it("places nothing when bb gives up on it before the answer arrives", async () => {
    sidebarFixture();
    const placements = pendingPlacements();

    const { controller } = await mountSidebarScript();
    controller.abort();
    await placements.settle(true);

    expect(document.querySelector("[data-icons-sidebar-root]")).toBeNull();
  });
});
