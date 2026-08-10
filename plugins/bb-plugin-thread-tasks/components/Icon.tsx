import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArchiveIcon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  CancelSquareIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  CheckListIcon,
  CircleIcon,
  Clock05Icon,
  DashedLineCircleIcon,
  DiamondIcon,
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
  SquareIcon,
  Target02Icon,
  Tick02Icon,
  UserAdd01Icon,
  WorkflowCircle03Icon,
  ComputerTerminal01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { ClockSquareIcon, DashedSquareIcon } from "./composed-icons";

const ICONS = {
  Archive: ArchiveIcon,
  AlertCircle: AlertCircleIcon,
  ArrowDown: ArrowDown01Icon,
  ArrowUp: ArrowUp01Icon,
  CancelCircle: CancelCircleIcon,
  CancelSquare: CancelSquareIcon,
  Check: Tick02Icon,
  CheckmarkCircle: CheckmarkCircle02Icon,
  CheckmarkSquare: CheckmarkSquare02Icon,
  ChevronRight: ArrowRight01Icon,
  Circle: CircleIcon,
  CircleQuestion: HelpCircleIcon,
  CircleX: CancelCircleIcon,
  Clock: Clock05Icon,
  ClockSquare: ClockSquareIcon,
  Close: Cancel01Icon,
  Columns2: LayoutTwoColumnIcon,
  Edit: Edit02Icon,
  DashedCircle: DashedLineCircleIcon,
  DashedSquare: DashedSquareIcon,
  Diamond: DiamondIcon,
  ListTodo: CheckListIcon,
  Loading: Loading03Icon,
  Mail: Mail01Icon,
  MailOpen: MailOpenIcon,
  MoreHorizontal: MoreHorizontalIcon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
  Search: Search01Icon,
  Square: SquareIcon,
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
