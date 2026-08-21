import type { WorkflowStage } from "../workflow-stage";
import { Icon, type IconName } from "./Icon";

const WORKFLOW_STAGE_ICONS: Record<WorkflowStage, IconName> = {
  Deferred: "CircleDashed",
  "Idle": "Progress01",
  Active: "Progress02",
  Blocked: "BlockedProgress",
  Completed: "CompletedProgress",
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
