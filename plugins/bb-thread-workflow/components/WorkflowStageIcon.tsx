import type { WorkflowStage } from "../workflow-stage";
import { Icon, type IconName } from "./Icon";

const WORKFLOW_STAGE_ICONS: Record<WorkflowStage, IconName> = {
  Backlog: "DashedSquare",
  Done: "CheckmarkSquare",
  "To do": "Square",
  Working: "Diamond",
  Blocked: "ClockSquare",
  Canceled: "CancelSquare",
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
