export type NativeProjectAction = "Project settings" | "Rename" | "Remove";

interface BreadcrumbPortalMount {
  target: HTMLElement;
  cleanup(): void;
}

const PLUGIN_ROOT_SELECTOR = "[data-project-header-breadcrumb-root]";

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

function findNativeProjectActionsTrigger(
  document: Document,
  projectName: string,
): HTMLButtonElement | null {
  const expectedLabel = `${projectName} actions`;
  return (
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button[aria-haspopup="menu"][aria-label]',
      ),
    ).find(
      (candidate) =>
        candidate.getAttribute("aria-label") === expectedLabel &&
        candidate.closest(PLUGIN_ROOT_SELECTOR) === null,
    ) ?? null
  );
}

function findMenuForTrigger(
  document: Document,
  trigger: HTMLButtonElement,
): HTMLElement | null {
  const controlledId = trigger.getAttribute("aria-controls");
  if (controlledId !== null) {
    const controlled = document.getElementById(controlledId);
    if (controlled?.getAttribute("role") === "menu") return controlled;
  }

  if (trigger.id === "") return null;
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]')).find(
      (menu) => menu.getAttribute("aria-labelledby") === trigger.id,
    ) ?? null
  );
}

function waitForMenu(
  document: Document,
  trigger: HTMLButtonElement,
): Promise<HTMLElement | null> {
  const current = findMenuForTrigger(document, trigger);
  if (current !== null) return Promise.resolve(current);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const menu = findMenuForTrigger(document, trigger);
      if (menu === null) return;
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve(menu);
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 1_000);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function findMenuItem(
  menu: HTMLElement,
  label: NativeProjectAction,
): HTMLElement | null {
  return (
    Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (item) => item.textContent?.trim() === label,
    ) ?? null
  );
}

function openNativeMenu(document: Document, trigger: HTMLButtonElement) {
  const EventConstructor = document.defaultView?.PointerEvent ?? MouseEvent;
  trigger.dispatchEvent(
    new EventConstructor("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );
  trigger.dispatchEvent(
    new EventConstructor("pointerup", {
      bubbles: true,
      cancelable: true,
      button: 0,
    }),
  );
}

export async function requestNativeProjectAction(
  document: Document,
  projectName: string,
  action: NativeProjectAction,
): Promise<boolean> {
  const trigger = findNativeProjectActionsTrigger(document, projectName);
  if (trigger === null) return false;

  openNativeMenu(document, trigger);
  const menu = await waitForMenu(document, trigger);
  if (menu === null) return false;

  const item = findMenuItem(menu, action);
  if (item === null) return false;
  item.click();
  return true;
}
