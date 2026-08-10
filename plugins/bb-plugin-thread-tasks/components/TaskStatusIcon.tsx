import type { ThreadStatus } from "../thread-status";
import { Icon, type IconName } from "./Icon";

const TASK_STATUS_ICONS: Record<ThreadStatus, IconName> = {
  Done: "CheckmarkSquare",
  "To do": "Square",
  Working: "Diamond",
  Waiting: "ClockSquare",
  Deferred: "DashedSquare",
  Canceled: "CancelSquare",
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
