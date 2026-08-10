import type { ThreadStatus } from "../thread-status";
import { Icon, type IconName } from "./Icon";

const TASK_STATUS_ICONS: Record<ThreadStatus, IconName> = {
  Done: "CheckmarkCircle",
  "To do": "Circle",
  Working: "Loading",
  Waiting: "Clock",
  Deferred: "DashedCircle",
  Canceled: "CancelCircle",
};

export function TaskStatusIcon({
  status,
  className,
}: {
  status: ThreadStatus;
  className?: string;
}) {
  return (
    <Icon
      name={TASK_STATUS_ICONS[status]}
      className={className}
      aria-hidden
    />
  );
}
