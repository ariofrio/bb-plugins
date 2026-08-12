import type { ThreadStatus } from "../thread-status";
import { Icon, type IconName } from "./Icon";

const TASK_STATUS_ICONS: Record<ThreadStatus, IconName> = {
  Backlog: "DashedSquare",
  Done: "CheckmarkSquare",
  "To do": "Square",
  Working: "Diamond",
  Waiting: "ClockSquare",
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
