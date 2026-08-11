/** Stamped by `bb plugin build`; undefined in tests and registry copies. */
declare const __BB_PLUGIN_ID__: string | undefined;

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
  // This node lives in bb's header, outside the plugin's mount, so it has to
  // carry its own scope root or none of the plugin's stylesheet reaches it —
  // colors, sizes, and the drag-region opt-out all silently do nothing.
  // The overlay marker is what lets Electron route clicks here rather than to
  // the window-drag region underneath.
  target.dataset.bbPluginRoot = "";
  target.dataset.bbPortaledOverlay = "";
  if (typeof __BB_PLUGIN_ID__ === "string") {
    target.dataset.bbPlugin = __BB_PLUGIN_ID__;
  }
  target.className =
    "inline-flex shrink-0 items-center [app-region:no-drag] [-webkit-app-region:no-drag]";
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
