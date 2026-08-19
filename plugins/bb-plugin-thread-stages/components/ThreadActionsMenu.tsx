import type { ReactNode } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type {
  PluginSidebarThread,
  PluginSidebarThreadActions,
} from "@get-bb/plugin-sdk/app";
import { WORKFLOW_STAGES, type WorkflowStage } from "../workflow-stage";
import { portalScopeProps } from "../lib/portal-scope";
import { Icon, type IconName } from "./Icon";

const CONTENT_CLASS =
  "z-[70] min-w-28 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
const SUB_CONTENT_CLASS =
  "z-[70] min-w-28 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
const ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-[0.3125rem] text-xs outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground [&>svg]:size-4 [&>svg]:shrink-0";
const DESTRUCTIVE_ITEM_CLASS = `${ITEM_CLASS} text-destructive data-[highlighted]:bg-destructive/15 data-[highlighted]:text-destructive`;
const SEPARATOR_CLASS = "-mx-1 my-1 h-px bg-border";

export interface ThreadSectionOption {
  id: string;
  name: string;
}

interface CommonMenuProps {
  actions: PluginSidebarThreadActions;
  disabled: boolean;
  sections: readonly ThreadSectionOption[];
  onNewSection: () => void;
  onRename: () => void;
  onSetSection: (sectionId: string | null) => void;
  onSetWorkflowStage: (stage: WorkflowStage) => void;
  workflowStage: WorkflowStage | null;
  thread: PluginSidebarThread;
  splitAvailable: boolean;
}

interface MenuSurfaceProps extends CommonMenuProps {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}

export function ThreadActionsContextMenu({
  children,
  onOpenChange,
  ...props
}: MenuSurfaceProps) {
  return (
    <ContextMenu.Root onOpenChange={onOpenChange}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          {...portalScopeProps()}
          aria-label="Thread actions"
          className={CONTENT_CLASS}
        >
          <ContextMenuItems {...props} />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function ThreadActionsDropdown({
  onOpenChange,
  ...props
}: CommonMenuProps & { onOpenChange: (open: boolean) => void }) {
  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Thread actions"
          className="relative m-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md p-0 text-subtle-foreground outline-none ring-sidebar-ring after:absolute after:left-1/2 after:top-1/2 after:h-7 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:text-foreground focus-visible:ring-2 data-[state=open]:bg-state-active data-[state=open]:text-foreground"
          onClick={(event) => event.stopPropagation()}
          onDragStart={(event) => event.preventDefault()}
        >
          <Icon name="MoreHorizontal" className="size-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          {...portalScopeProps()}
          align="end"
          sideOffset={4}
          className={CONTENT_CLASS}
        >
          <DropdownMenuItems {...props} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ContextMenuItems(props: CommonMenuProps) {
  const { actions, disabled, workflowStage, thread } = props;
  return (
    <>
      {props.splitAvailable ? (
        <>
          <ContextItem
            icon="Columns2"
            onSelect={() => actions.open(thread.id, { split: true })}
          >
            Open in split
          </ContextItem>
          <ContextMenu.Separator className={SEPARATOR_CLASS} />
        </>
      ) : null}
      <ContextItem
        icon={thread.isUnread ? "MailOpen" : "Mail"}
        onSelect={() => void actions.setRead(thread.id, thread.isUnread)}
      >
        {thread.isUnread ? "Mark read" : "Mark unread"}
      </ContextItem>
      <ContextItem
        icon={thread.isPinned ? "PinOff" : "Pin"}
        onSelect={() => void actions.setPinned(thread.id, !thread.isPinned)}
      >
        {thread.isPinned ? "Unpin" : "Pin"}
      </ContextItem>
      <ContextItem icon="Edit" onSelect={props.onRename}>
        Rename
      </ContextItem>
      <ContextMenu.Separator className={SEPARATOR_CLASS} />
      {workflowStage === null ? null : (
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger disabled={disabled} className={ITEM_CLASS}>
            <Icon name="ListTodo" aria-hidden />
            Move to stage
            <Icon name="ChevronRight" className="ml-auto" aria-hidden />
          </ContextMenu.SubTrigger>
          <ContextMenu.Portal>
            <ContextMenu.SubContent
              {...portalScopeProps()}
              className={SUB_CONTENT_CLASS}
            >
              {WORKFLOW_STAGES.map((stage) => (
                <ContextMenu.Item
                  key={stage}
                  className={ITEM_CLASS}
                  onSelect={() => {
                    if (stage !== workflowStage) props.onSetWorkflowStage(stage);
                  }}
                >
                  <span className="w-4">
                    {stage === workflowStage ? (
                      <Icon name="Check" aria-hidden />
                    ) : null}
                  </span>
                  {stage}
                </ContextMenu.Item>
              ))}
            </ContextMenu.SubContent>
          </ContextMenu.Portal>
        </ContextMenu.Sub>
      )}
      <ContextMenu.Sub>
        <ContextMenu.SubTrigger className={ITEM_CLASS}>
          <Icon name="ListView" aria-hidden />
          Move to section
          <Icon name="ChevronRight" className="ml-auto" aria-hidden />
        </ContextMenu.SubTrigger>
        <ContextMenu.Portal>
          <ContextMenu.SubContent
            {...portalScopeProps()}
            className={SUB_CONTENT_CLASS}
          >
            <ContextMenu.Item
              className={ITEM_CLASS}
              onSelect={() => {
                if (thread.sectionId !== null) props.onSetSection(null);
              }}
            >
              <span className="w-4">
                {thread.sectionId === null ? (
                  <Icon name="Check" aria-hidden />
                ) : null}
              </span>
              Uncategorized
            </ContextMenu.Item>
            {props.sections.map((section) => (
              <ContextMenu.Item
                key={section.id}
                className={ITEM_CLASS}
                onSelect={() => {
                  if (section.id !== thread.sectionId) {
                    props.onSetSection(section.id);
                  }
                }}
              >
                <span className="w-4">
                  {section.id === thread.sectionId ? (
                    <Icon name="Check" aria-hidden />
                  ) : null}
                </span>
                {section.name}
              </ContextMenu.Item>
            ))}
            <ContextMenu.Separator className={SEPARATOR_CLASS} />
            <ContextMenu.Item
              className={ITEM_CLASS}
              onSelect={props.onNewSection}
            >
              <Icon name="SectionAdd" aria-hidden />
              New section
            </ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Portal>
      </ContextMenu.Sub>
      <ContextMenu.Separator className={SEPARATOR_CLASS} />
      <ContextItem icon="Archive" onSelect={() => actions.archive(thread.id)}>
        Archive
      </ContextItem>
      <ContextItem
        destructive
        icon="Trash"
        onSelect={() => actions.requestDelete(thread.id)}
      >
        Delete
      </ContextItem>
    </>
  );
}

function DropdownMenuItems(props: CommonMenuProps) {
  const { actions, disabled, workflowStage, thread } = props;
  return (
    <>
      {props.splitAvailable ? (
        <>
          <DropdownItem
            icon="Columns2"
            onSelect={() => actions.open(thread.id, { split: true })}
          >
            Open in split
          </DropdownItem>
          <DropdownMenu.Separator className={SEPARATOR_CLASS} />
        </>
      ) : null}
      <DropdownItem
        icon={thread.isUnread ? "MailOpen" : "Mail"}
        onSelect={() => void actions.setRead(thread.id, thread.isUnread)}
      >
        {thread.isUnread ? "Mark read" : "Mark unread"}
      </DropdownItem>
      <DropdownItem
        icon={thread.isPinned ? "PinOff" : "Pin"}
        onSelect={() => void actions.setPinned(thread.id, !thread.isPinned)}
      >
        {thread.isPinned ? "Unpin" : "Pin"}
      </DropdownItem>
      <DropdownItem icon="Edit" onSelect={props.onRename}>
        Rename
      </DropdownItem>
      <DropdownMenu.Separator className={SEPARATOR_CLASS} />
      {workflowStage === null ? null : (
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger disabled={disabled} className={ITEM_CLASS}>
            <Icon name="ListTodo" aria-hidden />
            Move to stage
            <Icon name="ChevronRight" className="ml-auto" aria-hidden />
          </DropdownMenu.SubTrigger>
          <DropdownMenu.Portal>
            <DropdownMenu.SubContent
              {...portalScopeProps()}
              className={SUB_CONTENT_CLASS}
            >
              {WORKFLOW_STAGES.map((stage) => (
                <DropdownMenu.Item
                  key={stage}
                  className={ITEM_CLASS}
                  onSelect={() => {
                    if (stage !== workflowStage) props.onSetWorkflowStage(stage);
                  }}
                >
                  <span className="w-4">
                    {stage === workflowStage ? (
                      <Icon name="Check" aria-hidden />
                    ) : null}
                  </span>
                  {stage}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.SubContent>
          </DropdownMenu.Portal>
        </DropdownMenu.Sub>
      )}
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className={ITEM_CLASS}>
          <Icon name="ListView" aria-hidden />
          Move to section
          <Icon name="ChevronRight" className="ml-auto" aria-hidden />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent
            {...portalScopeProps()}
            className={SUB_CONTENT_CLASS}
          >
            <DropdownMenu.Item
              className={ITEM_CLASS}
              onSelect={() => {
                if (thread.sectionId !== null) props.onSetSection(null);
              }}
            >
              <span className="w-4">
                {thread.sectionId === null ? (
                  <Icon name="Check" aria-hidden />
                ) : null}
              </span>
              Uncategorized
            </DropdownMenu.Item>
            {props.sections.map((section) => (
              <DropdownMenu.Item
                key={section.id}
                className={ITEM_CLASS}
                onSelect={() => {
                  if (section.id !== thread.sectionId) {
                    props.onSetSection(section.id);
                  }
                }}
              >
                <span className="w-4">
                  {section.id === thread.sectionId ? (
                    <Icon name="Check" aria-hidden />
                  ) : null}
                </span>
                {section.name}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className={SEPARATOR_CLASS} />
            <DropdownMenu.Item
              className={ITEM_CLASS}
              onSelect={props.onNewSection}
            >
              <Icon name="SectionAdd" aria-hidden />
              New section
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
      <DropdownMenu.Separator className={SEPARATOR_CLASS} />
      <DropdownItem icon="Archive" onSelect={() => actions.archive(thread.id)}>
        Archive
      </DropdownItem>
      <DropdownItem
        destructive
        icon="Trash"
        onSelect={() => actions.requestDelete(thread.id)}
      >
        Delete
      </DropdownItem>
    </>
  );
}

function ContextItem({
  children,
  destructive = false,
  disabled,
  icon,
  onSelect,
}: {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  icon: IconName;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item
      disabled={disabled}
      className={destructive ? DESTRUCTIVE_ITEM_CLASS : ITEM_CLASS}
      onSelect={onSelect}
    >
      <Icon name={icon} aria-hidden />
      {children}
    </ContextMenu.Item>
  );
}

function DropdownItem({
  children,
  destructive = false,
  disabled,
  icon,
  onSelect,
}: {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  icon: IconName;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      className={destructive ? DESTRUCTIVE_ITEM_CLASS : ITEM_CLASS}
      onSelect={onSelect}
    >
      <Icon name={icon} aria-hidden />
      {children}
    </DropdownMenu.Item>
  );
}
