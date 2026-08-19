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
          listProjectIcons: () => ({
            icons: [],
            defaults: { project: CircleIcon, personal: CircleIcon },
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
