interface IconPortalMount {
  target: HTMLElement;
  cleanup(): void;
}

/**
 * bb has no slot before the thread title, so the icon is portaled into the
 * header the way the Project header breadcrumb plugin portals the project
 * name. When that plugin is installed the icon goes immediately before its
 * breadcrumb; otherwise it sits directly before the title.
 *
 * header-dom.test.ts pins both shapes so a bb header change fails here rather
 * than silently moving the icon.
 */
export function installProjectIconPortal(
  marker: HTMLElement,
): IconPortalMount | null {
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
    slotWrapper === null
  ) {
    return null;
  }

  const breadcrumb = center.querySelector<HTMLElement>(
    "[data-project-header-breadcrumb-root]",
  );
  const anchor = breadcrumb ?? titleContainer;

  const target = marker.ownerDocument.createElement("span");
  target.dataset.projectIconRoot = "";
  target.className = "inline-flex shrink-0 items-center";
  center.insertBefore(target, anchor);

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
