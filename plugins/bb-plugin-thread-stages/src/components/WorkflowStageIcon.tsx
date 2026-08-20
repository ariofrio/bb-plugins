import type { WorkflowStage } from "../workflow-stage";
import { Icon, type IconName } from "./Icon";

const WORKFLOW_STAGE_ICONS: Record<WorkflowStage, IconName> = {
  Backlog: "CircleDashed",
  "To do": "Progress01",
  Working: "Progress02",
  Blocked: "BlockedCircle",
  Done: "CheckmarkCircle",
  Canceled: "CircleX",
};

export function WorkflowStageIcon({
  stage,
  className,
}: {
  stage: WorkflowStage;
  className?: string;
}) {
  return (
    <Icon
      name={WORKFLOW_STAGE_ICONS[stage]}
      className={className}
      aria-hidden
    />
  );
}
