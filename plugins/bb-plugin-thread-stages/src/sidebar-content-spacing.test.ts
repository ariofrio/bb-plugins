// @vitest-environment jsdom
import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mountSidebarContentSpacing } from "./sidebar-content-spacing";

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe("mountSidebarContentSpacing", () => {
  it("compacts only the sidebar content containing the Thread stages list", async () => {
    const controller = new AbortController();
    const firstNav = document.createElement("div");
    firstNav.dataset.testid = "plugin-nav-sidebar-items";
    firstNav.style.paddingBottom = "3px";
    const firstContent = document.createElement("div");
    firstContent.dataset.sidebar = "content";
    const otherNav = document.createElement("div");
    otherNav.dataset.testid = "plugin-nav-sidebar-items";
    const otherContent = document.createElement("div");
    otherContent.dataset.sidebar = "content";
    document.body.append(firstNav, firstContent, otherNav, otherContent);

    const dispose = mountSidebarContentSpacing(controller.signal);
    expect(firstNav.style.paddingBottom).toBe("3px");
    expect(otherNav.style.paddingBottom).toBe("");

    const threadStagesRoot = document.createElement("div");
    threadStagesRoot.dataset.threadStagesSidebarRoot = "";
    threadStagesRoot.style.setProperty(
      "--bb-sidebar-sticky-stack-padding-top",
      "5px",
    );
    firstContent.append(threadStagesRoot);

    await waitFor(() => expect(firstNav.style.paddingBottom).toBe("0px"));
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("0px");
    expect(firstContent.style.marginTop).toBe("");
    expect(otherNav.style.paddingBottom).toBe("");

    threadStagesRoot.remove();
    await waitFor(() => expect(firstNav.style.paddingBottom).toBe("3px"));
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("5px");

    otherContent.append(threadStagesRoot);
    await waitFor(() => expect(otherNav.style.paddingBottom).toBe("0px"));
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("0px");

    dispose();
    expect(firstNav.style.paddingBottom).toBe("3px");
    expect(otherNav.style.paddingBottom).toBe("");
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("5px");
  });

  it("restores the host spacing when the content-script signal aborts", async () => {
    const controller = new AbortController();
    const nav = document.createElement("div");
    nav.dataset.testid = "plugin-nav-sidebar-items";
    const content = document.createElement("div");
    content.dataset.sidebar = "content";
    const threadStagesRoot = document.createElement("div");
    threadStagesRoot.dataset.threadStagesSidebarRoot = "";
    content.append(threadStagesRoot);
    document.body.append(nav, content);

    mountSidebarContentSpacing(controller.signal);
    expect(nav.style.paddingBottom).toBe("0px");
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("0px");
    expect(content.style.marginTop).toBe("");

    controller.abort();
    await waitFor(() => expect(nav.style.paddingBottom).toBe(""));
    expect(
      threadStagesRoot.style.getPropertyValue(
        "--bb-sidebar-sticky-stack-padding-top",
      ),
    ).toBe("");
  });
});
