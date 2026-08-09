import type {
  PluginSidebarThread,
  PluginSidebarThreadIndicator,
} from "@bb/plugin-sdk/app";
import { Icon } from "./Icon";

export function hasIndicator(
  indicator: PluginSidebarThreadIndicator,
): boolean {
  return indicator !== "none";
}

export function ThreadIndicator({
  indicator,
  label,
}: {
  indicator: PluginSidebarThreadIndicator;
  label: string | null;
}) {
  const iconClass = "size-3.5 shrink-0";
  const ariaLabel = label ?? undefined;

  switch (indicator) {
    case "unread-error":
      return (
        <Icon
          name="CircleX"
          aria-label={ariaLabel}
          className={`${iconClass} text-destructive`}
        />
      );
    case "waiting-for-input":
      return (
        <Icon
          name="CircleQuestion"
          aria-label={ariaLabel}
          className={`${iconClass} text-muted-foreground/75`}
        />
      );
    case "runtime":
      return (
        <Icon
          name="Loading"
          aria-label={ariaLabel}
          className={`${iconClass} animate-spin text-muted-foreground/50`}
        />
      );
    case "workflow":
      return <WorkingIcon name="Workflow" label={ariaLabel} />;
    case "background-agent":
      return <WorkingIcon name="UserRoundPlus" label={ariaLabel} />;
    case "background-command":
      return <WorkingIcon name="Terminal" label={ariaLabel} />;
    case "plan-mode":
      return <WorkingIcon name="ListTodo" label={ariaLabel} />;
    case "goal":
      return <WorkingIcon name="Target" label={ariaLabel} />;
    case "draft":
      return (
        <Icon
          name="Edit"
          aria-label={ariaLabel}
          className={`${iconClass} text-muted-foreground`}
        />
      );
    case "working-draft":
      return (
        <Icon
          name="Edit"
          aria-label={ariaLabel}
          className={`${iconClass} animate-shine-icon text-muted-foreground/50`}
        />
      );
    case "unread-success":
      return (
        <span
          aria-label={ariaLabel}
          className="flex size-3.5 shrink-0 items-center justify-center"
        >
          <span className="size-[5px] rounded-full bg-muted-foreground/60" />
        </span>
      );
    case "none":
    default:
      return null;
  }
}

function WorkingIcon({
  name,
  label,
}: {
  name: "Workflow" | "UserRoundPlus" | "Terminal" | "ListTodo" | "Target";
  label: string | undefined;
}) {
  return (
    <Icon
      name={name}
      aria-label={label}
      className="size-3.5 shrink-0 animate-shine-icon text-muted-foreground/50"
    />
  );
}

const INDICATOR_PRIORITY: readonly PluginSidebarThreadIndicator[] = [
  "unread-error",
  "waiting-for-input",
  "working-draft",
  "workflow",
  "background-agent",
  "background-command",
  "plan-mode",
  "goal",
  "runtime",
  "draft",
  "unread-success",
];

export function groupIndicator(
  threads: readonly PluginSidebarThread[],
): PluginSidebarThread | null {
  for (const indicator of INDICATOR_PRIORITY) {
    const thread = threads.find((candidate) => candidate.indicator === indicator);
    if (thread) return thread;
  }
  return null;
}
