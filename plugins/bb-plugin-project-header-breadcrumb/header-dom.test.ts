// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installBreadcrumbPortal,
  requestNativeProjectAction,
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
    expect(document.querySelector("[data-project-header-breadcrumb-root]")).toBeNull();
    expect(wrapper.hidden).toBe(false);
  });

  it("does nothing when the host thread-header structure is unavailable", () => {
    const marker = document.createElement("span");
    document.body.append(marker);

    expect(installBreadcrumbPortal(marker)).toBeNull();
  });
});

describe("requestNativeProjectAction", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens bb's project menu and selects the requested native action", async () => {
    const rename = vi.fn();
    const trigger = document.createElement("button");
    trigger.id = "native-project-actions";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-label", "bb-plugins actions");
    trigger.addEventListener("pointerdown", () => {
      const menu = document.createElement("div");
      menu.id = "native-project-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-labelledby", trigger.id);
      const item = document.createElement("div");
      item.setAttribute("role", "menuitem");
      item.textContent = "Rename";
      item.addEventListener("click", rename);
      menu.append(item);
      document.body.append(menu);
    });
    document.body.append(trigger);

    await expect(
      requestNativeProjectAction(document, "bb-plugins", "Rename"),
    ).resolves.toBe(true);
    expect(rename).toHaveBeenCalledOnce();
  });

  it("ignores the plugin's own trigger and reports a missing native menu", async () => {
    const pluginRoot = document.createElement("span");
    pluginRoot.dataset.projectHeaderBreadcrumbRoot = "";
    const trigger = document.createElement("button");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-label", "bb-plugins actions");
    pluginRoot.append(trigger);
    document.body.append(pluginRoot);

    await expect(
      requestNativeProjectAction(document, "bb-plugins", "Remove"),
    ).resolves.toBe(false);
  });
});
