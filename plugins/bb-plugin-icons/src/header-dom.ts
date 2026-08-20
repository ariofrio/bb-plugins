/** Stamped by `bb plugin build`; undefined in tests and registry copies. */
declare const __BB_PLUGIN_ID__: string | undefined;

/**
 * bb's own title container, found by what it holds rather than where it sits.
 *
 * Both this plugin and Icons insert a node of their own at the head of the
 * header, so whichever lands first becomes `center.firstElementChild` and the
 * other one, looking there for the title, finds a sibling plugin's node with
 * no <p> in it and gives up. Skipping anything marked as a plugin's root makes
 * the lookup independent of who arrives first.
 */
export function findTitleContainer(center: Element): HTMLElement | null {
  for (const child of Array.from(center.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.bbPluginRoot !== undefined) continue;
    if (child.querySelector("p") !== null) return child;
  }
  return null;
}

interface IconPortalMount {
  target: HTMLElement;
  cleanup(): void;
}

/**
 * bb has no slot before the thread title, so the icon is portaled into the
 * header the way the Breadcrumbs plugin portals the project name. When that
 * plugin is installed the icon goes immediately before its breadcrumb;
 * otherwise it sits directly before the title.
 *
 * header-dom.test.ts pins both shapes so a bb header change fails here rather
 * than silently moving the icon.
 */
export function installIconPortal(
  marker: HTMLElement,
): IconPortalMount | null {
  const header = marker.closest("header");
  const actionsMenu = header?.querySelector<HTMLElement>(
    '[data-testid="thread-detail-header-actions-menu"]',
  );
  const center = actionsMenu?.parentElement;
  const titleContainer =
    center === undefined || center === null ? null : findTitleContainer(center);
  const slotWrapper = marker.closest<HTMLElement>('[role="group"]');

  if (
    center === undefined ||
    center === null ||
    titleContainer === null ||
    slotWrapper === null
  ) {
    return null;
  }

  const breadcrumb = center.querySelector<HTMLElement>(
    "[data-breadcrumbs-root]",
  );
  const anchor = breadcrumb ?? titleContainer;

  const target = marker.ownerDocument.createElement("span");
  target.dataset.iconsRoot = "";
  // This node lives in bb's header, outside the plugin's mount, so it has to
  // carry its own scope root or the plugin's own stylesheet never reaches it.
  // Utilities bb uses itself (sizing, muted text, the drag-region opt-out)
  // come from bb's global stylesheet and work regardless; what needs the scope
  // is anything only this plugin uses — the icon color palette. The overlay
  // marker lets Electron route clicks here rather than to the drag region.
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
