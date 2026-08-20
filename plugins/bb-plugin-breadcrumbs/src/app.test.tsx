// @vitest-environment jsdom
import {
  loadPluginApp,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
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
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("project breadcrumb app registration", () => {
  it("registers the thread-header action through the plugin app contract", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.threadHeaderActions).toHaveLength(1);
    expect(app.threadHeaderActions[0]).toMatchObject({
      id: "project-breadcrumb",
      title: "Breadcrumbs",
    });
  });

  it("renders the current project through the registered action", async () => {
    document.body.innerHTML = `
      <header>
        <div><div><p>Thread title</p></div><span data-testid="thread-detail-header-actions-menu"></span></div>
        <span id="slot-wrapper" role="group"></span>
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

    expect(await slot.findByRole("button", { name: "Example project actions" })).toBeTruthy();
    slot.lifecycle.unmount();
  });
});
