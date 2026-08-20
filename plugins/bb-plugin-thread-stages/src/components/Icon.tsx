import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArchiveIcon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BanIcon,
  CancelCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  CircleDashedIcon,
  CircleIcon,
  CircleXIcon,
  Clock05Icon,
  DashedLineCircleIcon,
  Delete02Icon,
  Edit02Icon,
  FilterHorizontalIcon,
  Folder01Icon,
  FolderLibraryIcon,
  FolderPlus,
  HelpCircleIcon,
  LayoutTwoColumnIcon,
  Loading03Icon,
  ListViewIcon,
  Mail01Icon,
  MailOpenIcon,
  MoreHorizontalIcon,
  PinIcon,
  PinOffIcon,
  Progress02Icon,
  Search01Icon,
  Settings02Icon,
  Target02Icon,
  Tick02Icon,
  UserAdd01Icon,
  ViewOffIcon,
  WorkflowCircle03Icon,
  ComputerTerminal01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { ListViewOffIcon, SectionAddIcon } from "./composed-icons";

const ICONS = {
  Archive: ArchiveIcon,
  AlertCircle: AlertCircleIcon,
  ArrowDown: ArrowDown01Icon,
  ArrowUp: ArrowUp01Icon,
  Ban: BanIcon,
  CancelCircle: CancelCircleIcon,
  Check: Tick02Icon,
  CheckmarkCircle: CheckmarkCircle02Icon,
  CheckmarkSquare: CheckmarkSquare02Icon,
  ChevronRight: ArrowRight01Icon,
  Circle: CircleIcon,
  CircleDashed: CircleDashedIcon,
  CircleQuestion: HelpCircleIcon,
  CircleX: CircleXIcon,
  Clock: Clock05Icon,
  Close: Cancel01Icon,
  Columns2: LayoutTwoColumnIcon,
  Edit: Edit02Icon,
  EyeOff: ViewOffIcon,
  Filter: FilterHorizontalIcon,
  Folder: Folder01Icon,
  FolderLibrary: FolderLibraryIcon,
  FolderPlus,
  DashedCircle: DashedLineCircleIcon,
  ListView: ListViewIcon,
  ListViewOff: ListViewOffIcon,
  Loading: Loading03Icon,
  Mail: Mail01Icon,
  MailOpen: MailOpenIcon,
  MoreHorizontal: MoreHorizontalIcon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
  Progress02: Progress02Icon,
  Search: Search01Icon,
  Settings: Settings02Icon,
  SectionAdd: SectionAddIcon,
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
