import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { ThreadIndicator } from "./ThreadIndicator";

interface StageHeaderStatusProps {
  activityThread: Pick<
    PluginSidebarThread,
    "indicator" | "indicatorLabel"
  > | null;
  collapsed: boolean;
  count?: number;
}

export function StageHeaderStatus({
  activityThread,
  collapsed,
  count,
}: StageHeaderStatusProps) {
  const showCount = collapsed && count !== undefined && count > 0;
  const showIndicator = collapsed && activityThread !== null;

  return (
    <>
      {showCount ? (
        <span
          aria-label={`${count} ${count === 1 ? "thread" : "threads"}`}
          className={`pointer-events-none absolute z-20 inline-flex size-7 items-center justify-center tabular-nums text-xs text-subtle-foreground/60 ${
            showIndicator ? "right-7" : "right-0"
          }`}
        >
          {count}
        </span>
      ) : null}
      {showIndicator ? (
        <span
          data-sidebar-stage-trailing-indicator=""
          className="pointer-events-none absolute right-0 top-1/2 z-20 inline-flex size-7 -translate-y-1/2 items-center justify-center text-subtle-foreground"
        >
          <ThreadIndicator
            indicator={activityThread.indicator}
            label={activityThread.indicatorLabel}
          />
        </span>
      ) : null}
    </>
  );
}
