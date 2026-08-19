import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { portalScopeProps } from "../lib/portal-scope";
import type { ProjectIconView } from "../project-icons";
import { Icon } from "./Icon";

interface ProjectFilterProject {
  id: string;
  name: string;
}

interface ProjectFilterProps {
  onChange: (projectId: string | null) => void;
  onShowStageCountsChange: (show: boolean) => void;
  projectIcons?: ReadonlyMap<string, ProjectIconView>;
  projects: readonly ProjectFilterProject[];
  showStageCounts: boolean;
  value: string | null;
}

const CONTENT_CLASS =
  "z-[70] min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm py-[0.3125rem] pl-7 pr-2 text-xs outline-none transition-colors data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground";

export function ProjectFilter({
  onChange,
  onShowStageCountsChange,
  projectIcons = new Map(),
  projects,
  showStageCounts,
  value,
}: ProjectFilterProps) {
  const activeProject = projects.find((project) => project.id === value);
  const label = activeProject?.name ?? "All projects";
  const activeIcon = value === null ? null : projectIcons.get(value);

  return (
    <div className="mb-1 flex min-w-0">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Filter by project: ${label}`}
            className="flex h-7 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-subtle-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 data-[state=open]:bg-state-active data-[state=open]:text-sidebar-foreground"
          >
            {activeIcon ? (
              <HugeiconsIcon
                icon={activeIcon.glyph}
                className={`size-4 shrink-0 ${activeIcon.color === null ? "" : "text-foreground"}`}
                style={
                  activeIcon.color === null
                    ? undefined
                    : { color: activeIcon.color }
                }
                aria-hidden
              />
            ) : (
              <Icon
                name={value === null ? "Filter" : "Folder"}
                className="size-4 shrink-0"
                aria-hidden
              />
            )}
            <span className="truncate">{label}</span>
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
              value={value ?? ""}
              onValueChange={(projectId) => {
                onChange(projectId || null);
              }}
            >
              <ProjectFilterItem label="All projects" value="">
                <Icon name="Filter" className="size-4 shrink-0" aria-hidden />
              </ProjectFilterItem>
              {projects.map((project) => {
                const icon = projectIcons.get(project.id);
                return (
                  <ProjectFilterItem
                    key={project.id}
                    label={project.name}
                    value={project.id}
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
                  </ProjectFilterItem>
                );
              })}
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
    </div>
  );
}

function ProjectFilterItem({
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
