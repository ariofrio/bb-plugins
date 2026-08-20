import type { IconOwner } from "./store";

/** Stamped by `bb plugin build`; undefined in tests and registry copies. */
declare const __BB_PLUGIN_ID__: string | undefined;

export interface SidebarAnchor {
  owner: IconOwner;
  /** The group's name, for the control's accessible label. */
  name: string;
  /** A node of this plugin's, at the head of bb's own label row. */
  target: HTMLElement;
}

const OWNER_ATTRIBUTES: ReadonlyArray<{
  attribute: string;
  kind: IconOwner["kind"];
}> = [
  { attribute: "data-sidebar-project-id", kind: "project" },
  { attribute: "data-sidebar-section-id", kind: "section" },
];

const MOUNT_ATTRIBUTE = "data-icons-sidebar-root";

/**
 * bb's sidebar group header, as its own markup:
 *
 *     [data-sidebar-project-id | data-sidebar-section-id]
 *       └ [data-sidebar="group-label"]
 *           └ <span>  ← the label row: title, then the collapse button
 *
 * The icon goes at the head of that row, which is where Thread stages puts a
 * stage icon and what lines the group name up with the nav labels above it.
 * sidebar-dom.test.ts pins the shape, so a bb sidebar change fails there
 * rather than quietly dropping the icon.
 */
function labelRow(group: HTMLElement): HTMLElement | null {
  const label = group.querySelector<HTMLElement>('[data-sidebar="group-label"]');
  const row = label?.firstElementChild;
  return row instanceof HTMLElement ? row : null;
}

function createTarget(document: Document): HTMLElement {
  const target = document.createElement("span");
  target.setAttribute(MOUNT_ATTRIBUTE, "");
  // This node lives in bb's sidebar, outside the plugin's mount, so it carries
  // its own scope root or the plugin's stylesheet never reaches it.
  target.dataset.bbPluginRoot = "";
  if (typeof __BB_PLUGIN_ID__ === "string") {
    target.dataset.bbPlugin = __BB_PLUGIN_ID__;
  }
  target.className = "mr-1 inline-flex shrink-0 items-center";
  return target;
}

function collect(root: ParentNode): SidebarAnchor[] {
  const anchors: SidebarAnchor[] = [];
  for (const { attribute, kind } of OWNER_ATTRIBUTES) {
    const groups = Array.from(
      root.querySelectorAll<HTMLElement>(`[${attribute}]`),
    );
    for (const group of groups) {
      const id = group.getAttribute(attribute);
      const row = labelRow(group);
      if (id === null || id === "" || row === null) continue;

      const existing = row.querySelector<HTMLElement>(`:scope > [${MOUNT_ATTRIBUTE}]`);
      const target = existing ?? createTarget(group.ownerDocument);
      if (existing === null) row.insertBefore(target, row.firstChild);

      // Only bb's own child: this plugin's control carries a title of its
      // own, and a descendant search would read that back as the group name.
      const title = row.querySelector<HTMLElement>(":scope > [title]");
      anchors.push({
        owner: { kind, id },
        name: title?.getAttribute("title") ?? title?.textContent?.trim() ?? id,
        target,
      });
    }
  }
  return anchors;
}

function sameAnchors(left: SidebarAnchor[], right: SidebarAnchor[]): boolean {
  return (
    left.length === right.length &&
    left.every((anchor, index) => {
      const other = right[index]!;
      return (
        anchor.owner.kind === other.owner.kind &&
        anchor.owner.id === other.owner.id &&
        anchor.name === other.name &&
        anchor.target === other.target
      );
    })
  );
}

/**
 * Watches bb's sidebar and reports where this plugin may draw an icon.
 *
 * The list is re-reported whenever it changes, which covers more than a group
 * appearing: bb shows project groups under Organize → By project and section
 * groups only under Manually, so switching mode replaces every header at once.
 */
export function observeSidebarIconAnchors(
  onChange: (anchors: SidebarAnchor[]) => void,
  target: Document = document,
): () => void {
  let current: SidebarAnchor[] = [];
  let disposed = false;

  const sync = () => {
    if (disposed) return;
    const next = collect(target);
    if (sameAnchors(current, next)) return;
    current = next;
    onChange(next);
  };

  const observer = new MutationObserver(sync);
  observer.observe(target.documentElement, { childList: true, subtree: true });
  sync();

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const anchor of current) anchor.target.remove();
    current = [];
  };
}
