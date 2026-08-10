interface BreadcrumbPortalMount {
  target: HTMLElement;
  cleanup(): void;
}

export function installBreadcrumbPortal(
  marker: HTMLElement,
): BreadcrumbPortalMount | null {
  const header = marker.closest("header");
  const actionsMenu = header?.querySelector<HTMLElement>(
    '[data-testid="thread-detail-header-actions-menu"]',
  );
  const center = actionsMenu?.parentElement;
  const titleContainer = center?.firstElementChild;
  const slotWrapper = marker.closest<HTMLElement>('[role="group"]');

  if (
    center === undefined ||
    center === null ||
    !(titleContainer instanceof HTMLElement) ||
    titleContainer.querySelector("p") === null ||
    slotWrapper === null
  ) {
    return null;
  }

  const target = marker.ownerDocument.createElement("span");
  target.dataset.projectHeaderBreadcrumbRoot = "";
  target.className =
    "-mr-0.5 inline-flex min-w-0 shrink-0 items-center gap-1.5 text-sm font-semibold";
  center.insertBefore(target, titleContainer);

  const wasHidden = slotWrapper.hidden;
  slotWrapper.hidden = true;

  return {
    target,
    cleanup() {
      target.remove();
      slotWrapper.hidden = wasHidden;
    },
  };
}

export function navigateToProjectSettings(
  targetWindow: Window,
  projectId: string,
): void {
  const path = `/projects/${encodeURIComponent(projectId)}/settings`;
  targetWindow.history.pushState(null, "", path);
  targetWindow.dispatchEvent(new PopStateEvent("popstate"));
}
