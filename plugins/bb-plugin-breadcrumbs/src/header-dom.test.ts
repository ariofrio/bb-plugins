// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installBreadcrumbPortal,
  navigateToProjectSettings,
} from "./header-dom";

function installThreadHeaderFixture() {
  document.body.innerHTML = `
    <header>
      <div data-testid="app-page-header-content-row">
        <div>
          <div id="thread-header-center">
            <div id="thread-title-container">
              <p id="thread-title" class="truncate text-sm font-normal">Thread title</p>
            </div>
            <span data-testid="thread-detail-header-actions-menu"></span>
          </div>
        </div>
        <div data-thread-header-workflow-actions>
          <span id="plugin-slot-wrapper" role="group">
            <span id="plugin-marker"></span>
          </span>
        </div>
      </div>
    </header>
  `;

  return {
    marker: document.querySelector<HTMLElement>("#plugin-marker")!,
    title: document.querySelector<HTMLElement>("#thread-title")!,
    titleContainer: document.querySelector<HTMLElement>(
      "#thread-title-container",
    )!,
    wrapper: document.querySelector<HTMLElement>("#plugin-slot-wrapper")!,
  };
}

describe("installBreadcrumbPortal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("inserts a portal before the existing normal-weight thread title", () => {
    const { marker, title, titleContainer, wrapper } =
      installThreadHeaderFixture();

    const mounted = installBreadcrumbPortal(marker);

    expect(mounted?.target.nextElementSibling).toBe(titleContainer);
    expect(title.textContent).toBe("Thread title");
    expect(title.classList).toContain("font-normal");
    expect(wrapper.hidden).toBe(true);

    mounted?.cleanup();
    expect(document.querySelector("[data-breadcrumbs-root]")).toBeNull();
    expect(wrapper.hidden).toBe(false);
  });

  it("does nothing when the host thread-header structure is unavailable", () => {
    const marker = document.createElement("span");
    document.body.append(marker);

    expect(installBreadcrumbPortal(marker)).toBeNull();
  });
});

describe("navigateToProjectSettings", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("pushes the project settings route through browser history", () => {
    const popstate = vi.fn();
    window.addEventListener("popstate", popstate, { once: true });

    navigateToProjectSettings(window, "proj_1");

    expect(window.location.pathname).toBe("/projects/proj_1/settings");
    expect(popstate).toHaveBeenCalledOnce();
  });
});
