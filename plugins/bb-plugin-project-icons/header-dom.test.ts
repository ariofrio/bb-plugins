// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { installProjectIconPortal } from "./header-dom";

/** The bb thread header structure this plugin reaches into. */
function renderHeader({ withBreadcrumb }: { withBreadcrumb: boolean }): {
  marker: HTMLElement;
  center: HTMLElement;
} {
  document.body.innerHTML = `
    <header>
      <div data-center>
        <div data-title><p>Thread title</p></div>
        <div role="group"><span data-marker></span></div>
        <button data-testid="thread-detail-header-actions-menu"></button>
      </div>
    </header>
  `;
  const center = document.querySelector<HTMLElement>("[data-center]");
  if (center === null) throw new Error("missing center");
  if (withBreadcrumb) {
    const breadcrumb = document.createElement("span");
    breadcrumb.dataset.projectHeaderBreadcrumbRoot = "";
    center.insertBefore(breadcrumb, center.firstElementChild);
  }
  const marker = document.querySelector<HTMLElement>("[data-marker]");
  if (marker === null) throw new Error("missing marker");
  return { marker, center };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("installProjectIconPortal", () => {
  it("mounts before the breadcrumb when that plugin is present", () => {
    const { marker, center } = renderHeader({ withBreadcrumb: true });

    const mount = installProjectIconPortal(marker);

    expect(mount).not.toBeNull();
    expect(
      Array.from(center.children).map((child) =>
        child.hasAttribute("data-project-icon-root")
          ? "icon"
          : child.hasAttribute("data-project-header-breadcrumb-root")
            ? "breadcrumb"
            : child.hasAttribute("data-title")
              ? "title"
              : "other",
      ),
    ).toEqual(["icon", "breadcrumb", "title", "other", "other"]);
  });

  it("mounts before the title when the breadcrumb is not installed", () => {
    const { marker, center } = renderHeader({ withBreadcrumb: false });

    installProjectIconPortal(marker);

    expect(center.firstElementChild?.hasAttribute("data-project-icon-root")).toBe(
      true,
    );
  });

  it("hides its own slot and restores the header on cleanup", () => {
    const { marker, center } = renderHeader({ withBreadcrumb: true });
    const slot = marker.closest<HTMLElement>('[role="group"]');

    const mount = installProjectIconPortal(marker);
    expect(slot?.hidden).toBe(true);

    mount?.cleanup();
    expect(center.querySelector("[data-project-icon-root]")).toBeNull();
    expect(slot?.hidden).toBe(false);
  });

  it("opts its portal out of the desktop window drag region", () => {
    const { marker, center } = renderHeader({ withBreadcrumb: true });

    installProjectIconPortal(marker);

    // Electron treats the header as title bar; without this a left click drags
    // the window instead of reaching the button.
    const root = center.querySelector("[data-project-icon-root]");
    expect(root?.className).toContain("[app-region:no-drag]");
    expect(root?.className).toContain("[-webkit-app-region:no-drag]");
  });

  it("declines to mount when the header is not the shape it expects", () => {
    document.body.innerHTML = `<header><div role="group"><span data-marker></span></div></header>`;
    const marker = document.querySelector<HTMLElement>("[data-marker]");
    if (marker === null) throw new Error("missing marker");

    expect(installProjectIconPortal(marker)).toBeNull();
  });
});
