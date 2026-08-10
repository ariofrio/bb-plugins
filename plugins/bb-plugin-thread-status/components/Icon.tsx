import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArchiveIcon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  Cancel01Icon,
  CheckListIcon,
  Delete02Icon,
  Edit02Icon,
  HelpCircleIcon,
  LayoutTwoColumnIcon,
  Loading03Icon,
  Mail01Icon,
  MailOpenIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  Search01Icon,
  Target02Icon,
  Tick02Icon,
  UserAdd01Icon,
  WorkflowCircle03Icon,
  ComputerTerminal01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const ICONS = {
  Archive: ArchiveIcon,
  AlertCircle: AlertCircleIcon,
  ArrowDown: ArrowDown01Icon,
  ArrowUp: ArrowUp01Icon,
  Check: Tick02Icon,
  ChevronRight: ArrowRight01Icon,
  CircleQuestion: HelpCircleIcon,
  CircleX: CancelCircleIcon,
  Close: Cancel01Icon,
  Columns2: LayoutTwoColumnIcon,
  Edit: Edit02Icon,
  ListTodo: CheckListIcon,
  Loading: Loading03Icon,
  Mail: Mail01Icon,
  MailOpen: MailOpenIcon,
  MoreHorizontal: MoreHorizontalIcon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
  Search: Search01Icon,
  Target: Target02Icon,
  Terminal: ComputerTerminal01Icon,
  Trash: Delete02Icon,
  UserRoundPlus: UserAdd01Icon,
  Workflow: WorkflowCircle03Icon,
} as const satisfies Record<string, IconSvgElement>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel,
}: {
  name: IconName;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}) {
  return (
    <HugeiconsIcon
      icon={ICONS[name]}
      size={16}
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      data-icon={name}
    />
  );
}
