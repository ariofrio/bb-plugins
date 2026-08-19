import { useLayoutEffect, useState } from "react";

const APP_BROWSER_SELECTOR = "[data-app-browser]";

function readDialogCenterX(): string {
  if (typeof document === "undefined") return "50%";

  const browserPanel = Array.from(
    document.querySelectorAll<HTMLElement>(APP_BROWSER_SELECTOR),
  ).find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    const style = getComputedStyle(candidate);
    return (
      rect.left > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
  if (!browserPanel) return "50%";

  const browserLeft = Math.min(
    window.innerWidth,
    browserPanel.getBoundingClientRect().left,
  );
  return `${browserLeft / 2}px`;
}

/** Keep plugin dialogs out from beneath Electron's native Browser view. */
export function useDialogCenterX(open: boolean): string {
  const [centerX, setCenterX] = useState(() =>
    open ? readDialogCenterX() : "50%",
  );

  useLayoutEffect(() => {
    if (!open) {
      setCenterX("50%");
      return;
    }

    const sync = () => {
      const nextCenterX = readDialogCenterX();
      setCenterX((current) =>
        current === nextCenterX ? current : nextCenterX,
      );
    };
    sync();

    window.addEventListener("resize", sync);
    const mutationObserver = new MutationObserver(sync);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    const browserPanel = document.querySelector<HTMLElement>(
      APP_BROWSER_SELECTOR,
    );
    const resizeObserver =
      browserPanel && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(sync)
        : null;
    if (browserPanel) resizeObserver?.observe(browserPanel);

    return () => {
      window.removeEventListener("resize", sync);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
    };
  }, [open]);

  return centerX;
}
