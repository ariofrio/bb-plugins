import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { portalScopeProps } from "../lib/portal-scope";
import type { ProjectIconView } from "../icons";
import {
  serializeThreadFilter,
  type ThreadFilter as ThreadFilterValue,
} from "../thread-filter";
import { Icon } from "./Icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ThreadFilterProject {
  id: string;
  isPersonal?: boolean;
  name: string;
}

interface ThreadFilterSection {
  id: string;
  name: string;
}

interface ThreadFilterProps {
  newProjectDisabled?: boolean;
  onChange: (filter: ThreadFilterValue) => void;
  onNewProject: () => void;
  onNewSection: () => void;
  onAddProjectLocalPath?: (project: ThreadFilterProject) => void;
  onOpenProjectSettings?: (project: ThreadFilterProject) => void;
  onRemoveProject?: (project: ThreadFilterProject) => void;
  onRemoveSection?: (section: ThreadFilterSection) => void;
  onRenameProject?: (project: ThreadFilterProject) => void;
  onRenameSection?: (section: ThreadFilterSection) => void;
  projectActionStates?: ReadonlyMap<string, { canAddLocalPath: boolean }>;
  projectIcons?: ReadonlyMap<string, ProjectIconView>;
  projects: readonly ThreadFilterProject[];
  sections: readonly ThreadFilterSection[];
  value: ThreadFilterValue;
}

const CONTENT_CLASS =
  "z-[70] min-w-52 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm py-[0.3125rem] pl-7 pr-2 text-xs outline-none transition-colors data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground";
const ACTION_ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-[0.3125rem] text-xs outline-none transition-colors data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground";
const ACTIONABLE_ITEM_CLASS =
  "relative flex cursor-default select-none items-center pr-1 text-xs outline-none";
const ACTIONABLE_SELECT_TARGET_CLASS =
  "relative flex min-w-0 flex-1 items-center gap-2 rounded-sm py-[0.3125rem] pl-7 pr-2 transition-colors data-[active]:bg-state-hover data-[active]:text-foreground";
const ACTION_CLASS =
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none ring-sidebar-ring transition-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 max-md:pointer-coarse:size-9";
const ACTION_TOOLTIP_DELAY_MS = 350;
const LABEL_CLASS =
  "px-2 py-1.5 text-[11px] font-medium text-muted-foreground";
const SUB_CONTENT_CLASS = `${CONTENT_CLASS} z-[80]`;
const SubmenuPointerEnterContext = createContext<(() => void) | undefined>(
  undefined,
);

export function ThreadFilter({
  newProjectDisabled = false,
  onChange,
  onNewProject,
  onNewSection,
  onAddProjectLocalPath = () => {},
  onOpenProjectSettings = () => {},
  onRemoveProject = () => {},
  onRemoveSection = () => {},
  onRenameProject = () => {},
  onRenameSection = () => {},
  projectActionStates = new Map(),
  projectIcons = new Map(),
  projects,
  sections,
  value,
}: ThreadFilterProps) {
  const [open, setOpen] = useState(false);
  const activeProject =
    value?.kind === "project"
      ? projects.find((project) => project.id === value.id)
      : undefined;
  const activeSection =
    value?.kind === "section"
      ? sections.find((section) => section.id === value.id)
      : undefined;
  const activeUncategorized = value?.kind === "uncategorized";
  const activeLabel = activeProject?.isPersonal
    ? "Threads"
    : activeProject?.name ??
      activeSection?.name ??
      (activeUncategorized ? "Uncategorized" : null);
  const personalProject = projects.find((project) => project.isPersonal);
  const regularProjects = projects.filter((project) => !project.isPersonal);
  const scopeLabel =
    sections.length === 0 ? "Projects" : "Projects and sections";
  const allLabel =
    sections.length === 0 ? "All projects" : "All projects and sections";

  return (
    <div className="group/thread-filter sticky top-[var(--bb-sidebar-sticky-stack-padding-top)] z-[70] mb-4 flex min-w-0 items-center gap-1 rounded-md bg-sidebar outline-none ring-sidebar-ring has-[.thread-filter-trigger:focus-visible]:ring-2 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-2 before:bg-sidebar before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-sidebar after:content-['']">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            data-thread-filter-trigger=""
            aria-label={
              activeLabel === null
                ? scopeLabel
                : `${scopeLabel}: ${activeLabel}`
            }
            className="thread-filter-trigger flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/85 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-state-active data-[state=open]:text-sidebar-foreground max-md:pointer-coarse:h-9 dark:text-sidebar-foreground"
          >
            {activeProject ? (
              <ProjectFilterIcon icon={projectIcons.get(activeProject.id)} />
            ) : activeSection || activeUncategorized ? (
              <Icon name="ListView" className="size-4 shrink-0" aria-hidden />
            ) : (
              <Icon
                name="FolderLibrary"
                className="size-4 shrink-0"
                aria-hidden
              />
            )}
            <span className="truncate">{activeLabel ?? scopeLabel}</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            {...portalScopeProps()}
            align="start"
            sideOffset={4}
            className={CONTENT_CLASS}
          >
            <DropdownMenu.RadioGroup
              value={serializeThreadFilter(value) ?? ""}
              onValueChange={(nextValue) => {
                if (!nextValue) {
                  onChange(null);
                  return;
                }
                if (nextValue === "uncategorized") {
                  onChange({ kind: "uncategorized" });
                  return;
                }
                const [kind, id] = nextValue.split(":", 2);
                if ((kind === "project" || kind === "section") && id) {
                  onChange({ kind, id });
                }
              }}
            >
              <ThreadFilterItem label={allLabel} value="">
                <Icon
                  name="FolderLibrary"
                  className="size-4 shrink-0"
                  aria-hidden
                />
              </ThreadFilterItem>
              {projects.length > 0 ? (
                <>
                  <DropdownMenu.Label className={LABEL_CLASS}>
                    Projects
                  </DropdownMenu.Label>
                  <DropdownMenu.Group>
                    {personalProject ? (
                      <ThreadFilterItem
                        label="Threads"
                        value={`project:${personalProject.id}`}
                      >
                        <ProjectFilterIcon
                          icon={projectIcons.get(personalProject.id)}
                        />
                      </ThreadFilterItem>
                    ) : null}
                    {regularProjects.map((project) => (
                      <ActionableThreadFilterItem
                        key={project.id}
                        label={project.name}
                        selected={
                          value?.kind === "project" && value.id === project.id
                        }
                        onSelect={() => {
                          onChange({ kind: "project", id: project.id });
                          setOpen(false);
                        }}
                      >
                        <ProjectFilterIcon
                          icon={projectIcons.get(project.id)}
                        />
                        <ProjectActions
                          canAddLocalPath={
                            projectActionStates.get(project.id)
                              ?.canAddLocalPath ?? false
                          }
                          onAddLocalPath={() => onAddProjectLocalPath(project)}
                          onOpenSettings={() =>
                            onOpenProjectSettings(project)
                          }
                          onRemove={() => onRemoveProject(project)}
                          onRename={() => onRenameProject(project)}
                        />
                      </ActionableThreadFilterItem>
                    ))}
                  </DropdownMenu.Group>
                </>
              ) : null}
              {sections.length > 0 ? (
                <>
                  <DropdownMenu.Label className={LABEL_CLASS}>
                    Sections
                  </DropdownMenu.Label>
                  <DropdownMenu.Group>
                    <ThreadFilterItem
                      label="Uncategorized"
                      value="uncategorized"
                    >
                      <Icon
                        name="ListView"
                        className="size-4 shrink-0"
                        aria-hidden
                      />
                    </ThreadFilterItem>
                    {sections.map((section) => (
                      <ActionableThreadFilterItem
                        key={section.id}
                        label={section.name}
                        selected={
                          value?.kind === "section" && value.id === section.id
                        }
                        onSelect={() => {
                          onChange({ kind: "section", id: section.id });
                          setOpen(false);
                        }}
                      >
                        <Icon
                          name="ListView"
                          className="size-4 shrink-0"
                          aria-hidden
                        />
                        <SectionActions
                          onRemove={() => onRemoveSection(section)}
                          onRename={() => onRenameSection(section)}
                        />
                      </ActionableThreadFilterItem>
                    ))}
                  </DropdownMenu.Group>
                </>
              ) : null}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <TooltipProvider>
        <span
          data-thread-filter-actions=""
          className="relative z-20 flex shrink-0 items-center gap-1 opacity-0 pointer-events-none group-hover/thread-filter:opacity-100 group-hover/thread-filter:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto max-md:pointer-coarse:opacity-100 max-md:pointer-coarse:pointer-events-auto"
        >
          <ThreadFilterAction
            disabled={newProjectDisabled}
            icon="FolderPlus"
            label="New project"
            onClick={onNewProject}
          />
          <ThreadFilterAction
            icon="SectionAdd"
            label="New section"
            onClick={onNewSection}
          />
        </span>
      </TooltipProvider>
    </div>
  );
}

function ActionableThreadFilterItem({
  children,
  label,
  onSelect,
  selected,
}: {
  children: React.ReactNode;
  label: string;
  onSelect: () => void;
  selected: boolean;
}) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const suppressSyntheticClick = useRef(false);

  function handleClick(event: ReactMouseEvent<HTMLDivElement>): void {
    if (
      !(event.target instanceof Node) ||
      !event.currentTarget.contains(event.target)
    ) {
      return;
    }
    if (suppressSyntheticClick.current) {
      suppressSyntheticClick.current = false;
      event.preventDefault();
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest("[data-thread-filter-submenu-chevron]")
    ) {
      return;
    }
    event.preventDefault();
    onSelect();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (
      !(event.target instanceof Node) ||
      !event.currentTarget.contains(event.target)
    ) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
      return;
    }
    if (event.key === "ArrowRight") {
      suppressSyntheticClick.current = true;
      queueMicrotask(() => {
        suppressSyntheticClick.current = false;
      });
      return;
    }
    if (event.key === "F10" && event.shiftKey) {
      event.preventDefault();
      setSubmenuOpen(true);
    }
  }

  return (
    <DropdownMenu.Sub open={submenuOpen} onOpenChange={setSubmenuOpen}>
      <DropdownMenu.SubTrigger
        role="menuitemradio"
        aria-checked={selected}
        className={ACTIONABLE_ITEM_CLASS}
        onClick={handleClick}
        onContextMenu={(event) => {
          event.preventDefault();
          setSubmenuOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onPointerEnter={() => setPointerInside(true)}
        onPointerLeave={() => setPointerInside(false)}
        onPointerMove={(event) => {
          if (
            event.target instanceof Node &&
            event.currentTarget.contains(event.target)
          ) {
            setPointerInside(true);
          }
        }}
      >
        <span
          data-thread-filter-select-target=""
          data-active={pointerInside ? "" : undefined}
          className={ACTIONABLE_SELECT_TARGET_CLASS}
        >
          {selected ? (
            <span className="absolute left-2 inline-flex size-3.5 items-center justify-center">
              <Icon name="Check" className="size-3.5" aria-hidden />
            </span>
          ) : null}
          <SubmenuPointerEnterContext.Provider
            value={() => setPointerInside(false)}
          >
            {children}
          </SubmenuPointerEnterContext.Provider>
          <span className="truncate">{label}</span>
        </span>
        <span
          data-thread-filter-submenu-chevron=""
          data-active={!pointerInside && submenuOpen ? "" : undefined}
          className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors data-[active]:bg-state-hover data-[active]:text-foreground"
        >
          <Icon name="ChevronRight" className="size-3.5" aria-hidden />
        </span>
      </DropdownMenu.SubTrigger>
    </DropdownMenu.Sub>
  );
}

function ProjectActions({
  canAddLocalPath,
  onAddLocalPath,
  onOpenSettings,
  onRemove,
  onRename,
}: {
  canAddLocalPath: boolean;
  onAddLocalPath: () => void;
  onOpenSettings: () => void;
  onRemove: () => void;
  onRename: () => void;
}) {
  const onSubmenuPointerEnter = useContext(SubmenuPointerEnterContext);

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        {...portalScopeProps()}
        sideOffset={2}
        className={SUB_CONTENT_CLASS}
        onPointerEnter={onSubmenuPointerEnter}
      >
        <FilterActionItem
          icon="Settings"
          label="Project settings"
          onSelect={onOpenSettings}
        />
        <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
        <FilterActionItem icon="Edit" label="Rename" onSelect={onRename} />
        {canAddLocalPath ? (
          <FilterActionItem
            icon="FolderPlus"
            label="Add local path"
            onSelect={onAddLocalPath}
          />
        ) : null}
        <FilterActionItem
          destructive
          icon="Trash"
          label="Remove"
          onSelect={onRemove}
        />
      </DropdownMenu.SubContent>
    </DropdownMenu.Portal>
  );
}

function SectionActions({
  onRemove,
  onRename,
}: {
  onRemove: () => void;
  onRename: () => void;
}) {
  const onSubmenuPointerEnter = useContext(SubmenuPointerEnterContext);

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        {...portalScopeProps()}
        sideOffset={2}
        className={SUB_CONTENT_CLASS}
        onPointerEnter={onSubmenuPointerEnter}
      >
        <FilterActionItem icon="Edit" label="Rename" onSelect={onRename} />
        <FilterActionItem
          destructive
          icon="Trash"
          label="Remove"
          onSelect={onRemove}
        />
      </DropdownMenu.SubContent>
    </DropdownMenu.Portal>
  );
}

function FilterActionItem({
  destructive = false,
  icon,
  label,
  onSelect,
}: {
  destructive?: boolean;
  icon: "Edit" | "FolderPlus" | "Settings" | "Trash";
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      className={`${ACTION_ITEM_CLASS} ${destructive ? "text-destructive focus:text-destructive" : ""}`}
      onSelect={onSelect}
    >
      <Icon name={icon} className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </DropdownMenu.Item>
  );
}

function ProjectFilterIcon({ icon }: { icon?: ProjectIconView }) {
  if (!icon) {
    return <Icon name="Folder" className="size-4 shrink-0" aria-hidden />;
  }

  return (
    <HugeiconsIcon
      icon={icon.glyph}
      className="size-4 shrink-0"
      style={icon.color === null ? undefined : { color: icon.color }}
      aria-hidden
    />
  );
}

function ThreadFilterAction({
  disabled = false,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: "FolderPlus" | "SectionAdd";
  label: string;
  onClick: () => void;
}) {
  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.detail > 0) {
      event.currentTarget.blur();
    }
    onClick();
  }

  const button = (
    <button
      type="button"
      aria-label={label}
      className={ACTION_CLASS}
      disabled={disabled}
      onClick={handleClick}
    >
      <Icon name={icon} className="size-4" aria-hidden />
    </button>
  );

  return (
    <Tooltip delayDuration={ACTION_TOOLTIP_DELAY_MS} disableHoverableContent>
      <TooltipTrigger asChild>
        {disabled ? <span className="inline-flex">{button}</span> : button}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ThreadFilterItem({
  children,
  label,
  value,
}: {
  children: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <DropdownMenu.RadioItem value={value} className={ITEM_CLASS}>
      <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex size-3.5 items-center justify-center">
        <Icon name="Check" className="size-3.5" aria-hidden />
      </DropdownMenu.ItemIndicator>
      {children}
      <span className="truncate">{label}</span>
    </DropdownMenu.RadioItem>
  );
}
