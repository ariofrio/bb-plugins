import type { IconOwner } from "./store";

export interface CrumbAnchor {
  element: HTMLElement;
  owner: IconOwner;
}

const SELECTOR = "[data-breadcrumb-icon-anchor][data-breadcrumb-icon-owner]";

/** Reads the anchors the Breadcrumbs plugin leaves beside its crumbs. */
export function readCrumbAnchors(root: ParentNode): CrumbAnchor[] {
  const anchors: CrumbAnchor[] = [];
  for (const element of Array.from(root.querySelectorAll<HTMLElement>(SELECTOR))) {
    const kind = element.dataset.breadcrumbIconAnchor;
    const id = element.dataset.breadcrumbIconOwner;
    if ((kind !== "section" && kind !== "project") || !id) continue;
    anchors.push({ element, owner: { kind, id } });
  }
  return anchors;
}

export function sameAnchors(
  left: readonly CrumbAnchor[],
  right: readonly CrumbAnchor[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (anchor, index) =>
        anchor.element === right[index]?.element &&
        anchor.owner.kind === right[index]?.owner.kind &&
        anchor.owner.id === right[index]?.owner.id,
    )
  );
}

/**
 * Calls back with the anchors currently in the document, and again whenever
 * they change.
 *
 * The neighbour draws them on its own schedule — its crumbs wait on their own
 * backend, and can be redrawn when a thread moves — so this watches rather
 * than reads once. Reporting only real changes keeps a header that redraws for
 * its own reasons from remounting icons that have not moved.
 */
export function observeCrumbAnchors(
  onChange: (anchors: CrumbAnchor[]) => void,
  root: Document = document,
): () => void {
  let last: CrumbAnchor[] = [];
  const read = () => {
    const next = readCrumbAnchors(root);
    if (sameAnchors(last, next)) return;
    last = next;
    onChange(next);
  };
  read();
  const observer = new MutationObserver(read);
  observer.observe(root.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
