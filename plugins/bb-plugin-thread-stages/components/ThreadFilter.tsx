import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { portalScopeProps } from "../lib/portal-scope";
import type { ProjectIconView } from "../project-icons";
import {
  serializeThreadFilter,
  type ThreadFilter as ThreadFilterValue,
} from "../thread-filter";
import { Icon } from "./Icon";

interface ThreadFilterProject {
  id: string;
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
  onShowStageCountsChange: (show: boolean) => void;
  projectIcons?: ReadonlyMap<string, ProjectIconView>;
  projects: readonly ThreadFilterProject[];
  sections: readonly ThreadFilterSection[];
  showStageCounts: boolean;
  value: ThreadFilterValue;
}

const CONTENT_CLASS =
  "z-[70] min-w-52 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm py-[0.3125rem] pl-7 pr-2 text-xs outline-none transition-colors data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground";
const ACTION_CLASS =
  "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none ring-sidebar-ring transition-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 max-md:pointer-coarse:size-9";
const LABEL_CLASS =
  "px-2 py-1.5 text-[11px] font-medium text-muted-foreground";

export function ThreadFilter({
  newProjectDisabled = false,
  onChange,
  onNewProject,
  onNewSection,
  onShowStageCountsChange,
  projectIcons = new Map(),
  projects,
  sections,
  showStageCounts,
  value,
}: ThreadFilterProps) {
  const activeProject =
    value?.kind === "project"
      ? projects.find((project) => project.id === value.id)
      : undefined;
  const activeSection =
    value?.kind === "section"
      ? sections.find((section) => section.id === value.id)
      : undefined;
  const activeLabel = activeProject?.name ?? activeSection?.name ?? null;

  return (
    <div className="sticky top-2 z-[70] mb-4 flex min-w-0 items-center gap-1 bg-sidebar before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-2 before:bg-sidebar before:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-sidebar after:content-['']">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={
              activeLabel === null
                ? "Filter threads"
                : `Filter threads: ${activeLabel}`
            }
            className="flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/85 outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[state=open]:bg-state-active data-[state=open]:text-sidebar-foreground max-md:pointer-coarse:h-9 dark:text-sidebar-foreground"
          >
            <Icon name="FilterMail" className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{activeLabel ?? "Filter threads"}</span>
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
                const [kind, id] = nextValue.split(":", 2);
                if ((kind === "project" || kind === "section") && id) {
                  onChange({ kind, id });
                }
              }}
            >
              <ThreadFilterItem label="All threads" value="">
                <Icon name="FilterMail" className="size-4 shrink-0" aria-hidden />
              </ThreadFilterItem>
              <DropdownMenu.Label className={LABEL_CLASS}>
                Projects
              </DropdownMenu.Label>
              <DropdownMenu.Group>
                {projects.map((project) => {
                  const icon = projectIcons.get(project.id);
                  return (
                    <ThreadFilterItem
                      key={project.id}
                      label={project.name}
                      value={`project:${project.id}`}
                    >
                      {icon ? (
                        <HugeiconsIcon
                          icon={icon.glyph}
                          className="size-4 shrink-0"
                          style={
                            icon.color === null
                              ? undefined
                              : { color: icon.color }
                          }
                          aria-hidden
                        />
                      ) : (
                        <Icon
                          name="Folder"
                          className="size-4 shrink-0"
                          aria-hidden
                        />
                      )}
                    </ThreadFilterItem>
                  );
                })}
              </DropdownMenu.Group>
              <DropdownMenu.Label className={LABEL_CLASS}>
                Sections
              </DropdownMenu.Label>
              <DropdownMenu.Group>
                {sections.map((section) => (
                  <ThreadFilterItem
                    key={section.id}
                    label={section.name}
                    value={`section:${section.id}`}
                  >
                    <Icon
                      name="ListView"
                      className="size-4 shrink-0"
                      aria-hidden
                    />
                  </ThreadFilterItem>
                ))}
              </DropdownMenu.Group>
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />
            <DropdownMenu.CheckboxItem
              checked={showStageCounts}
              className={ITEM_CLASS}
              onCheckedChange={(checked) => {
                onShowStageCountsChange(checked === true);
              }}
              onSelect={(event) => event.preventDefault()}
            >
              <DropdownMenu.ItemIndicator className="absolute left-2 inline-flex size-3.5 items-center justify-center">
                <Icon name="Check" className="size-3.5" aria-hidden />
              </DropdownMenu.ItemIndicator>
              <span>Show stage counts</span>
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <button
        type="button"
        aria-label="New project"
        className={ACTION_CLASS}
        disabled={newProjectDisabled}
        onClick={onNewProject}
      >
        <Icon name="FolderPlus" className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="New section"
        className={ACTION_CLASS}
        onClick={onNewSection}
      >
        <Icon name="SectionAdd" className="size-4" aria-hidden />
      </button>
    </div>
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
