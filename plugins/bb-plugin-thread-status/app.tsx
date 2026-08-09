import {
  definePluginApp,
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreadSplit,
  experimental_useSidebarThreads,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
  type PluginSidebarThread,
  type PluginSidebarThreadActions,
  type PluginThreadListProps,
} from "@bb/plugin-sdk/app";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { rpcContract } from "./server";
import {
  THREAD_STATUSES,
  destinationOrder,
  groupThreadsByStatus,
  type ThreadAssignment,
  type ThreadStatus,
} from "./thread-status";
import { Icon } from "./components/Icon";
import {
  ThreadActionsContextMenu,
  ThreadActionsDropdown,
} from "./components/ThreadActionsMenu";
import {
  groupIndicator,
  ThreadIndicator,
} from "./components/ThreadIndicator";
import { SplitPaneMiniMap } from "./components/SplitPaneMiniMap";

interface OrganizationState {
  assignments: ThreadAssignment[];
}

interface ThreadRowProps {
  actions: PluginSidebarThreadActions;
  active: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  disabled: boolean;
  dragging: boolean;
  onChangeStatus: (status: ThreadStatus) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onNavigate: () => void;
  projectName: string | null;
  showDropAfter: boolean;
  showDropBefore: boolean;
  taskStatus: ThreadStatus;
  thread: PluginSidebarThread;
}

function threadTitle(thread: PluginSidebarThread): string {
  return thread.title ?? thread.titleFallback ?? "Untitled thread";
}

function ThreadRow({
  actions,
  active,
  canMoveDown,
  canMoveUp,
  disabled,
  dragging,
  onChangeStatus,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onNavigate,
  projectName,
  showDropAfter,
  showDropBefore,
  taskStatus,
  thread,
}: ThreadRowProps) {
  const { splitProps, isAvailable: splitAvailable, layout } =
    experimental_useSidebarThreadSplit(thread.id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(() => threadTitle(thread));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishingRename = useRef(false);
  const title = threadTitle(thread);
  const accessibleTitle = projectName ? `${projectName} — ${title}` : title;
  const actionsOpen = dropdownOpen || contextOpen;

  useEffect(() => {
    if (!editing) setDraftTitle(title);
  }, [editing, title]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function openThread(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    actions.open(thread.id, {
      split: splitAvailable && (event.metaKey || event.ctrlKey),
    });
    onNavigate();
  }

  function finishRename(): void {
    if (!editing || finishingRename.current) return;
    finishingRename.current = true;
    const nextTitle = draftTitle.trim();
    setEditing(false);
    if (!nextTitle || nextTitle === title) {
      setDraftTitle(title);
      return;
    }
    void actions.rename(thread.id, nextTitle);
  }

  function cancelRename(): void {
    finishingRename.current = true;
    setDraftTitle(title);
    setEditing(false);
  }

  const commonMenuProps = {
    actions,
    canMoveDown,
    canMoveUp,
    disabled,
    onMoveDown,
    onMoveUp,
    onRename: () =>
      window.setTimeout(() => {
        finishingRename.current = false;
        setEditing(true);
      }, 0),
    onSetTaskStatus: onChangeStatus,
    splitAvailable,
    taskStatus,
    thread,
  };

  const row = (
    <li
      className="relative list-none"
      onDragOver={(event) => {
        if (editing) return;
        event.preventDefault();
        event.stopPropagation();
        onDragOver(event);
      }}
      onDrop={onDrop}
    >
      {showDropBefore ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px left-2 right-2 z-20 h-0.5 rounded-full bg-primary"
        />
      ) : null}
      {showDropAfter ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px left-2 right-2 z-20 h-0.5 rounded-full bg-primary"
        />
      ) : null}
      <div
        className={`bb-sidebar-hover-actions-row group/thread-row relative flex h-7 w-full items-center gap-2 rounded-md pl-2 pr-0 text-sm transition-colors max-md:pointer-coarse:h-10 ${
          active
            ? "bg-state-active text-sidebar-foreground"
            : "cursor-pointer text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground"
        } ${!active && layout !== null ? "bg-sidebar-accent/50" : ""} ${
          dragging ? "opacity-40" : ""
        } ${disabled ? "" : "select-none"}`}
        draggable={!disabled && !editing}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
      >
        {editing ? (
          <form
            className="relative z-30 min-w-0 flex-1"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              finishRename();
            }}
          >
            <input
              ref={inputRef}
              aria-label={`Rename ${title}`}
              className="h-6 w-full rounded-md border border-sidebar-border bg-sidebar-accent px-1.5 text-sm text-sidebar-foreground outline-none ring-sidebar-ring focus:ring-2"
              value={draftTitle}
              onBlur={finishRename}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRename();
                }
              }}
            />
          </form>
        ) : (
          <>
            <a
              {...splitProps}
              aria-label={`Open ${accessibleTitle}`}
              className="absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
              data-sidebar-thread-id={thread.id}
              data-sidebar-thread-shortcut-target=""
              href={`#thread-${encodeURIComponent(thread.id)}`}
              onClick={openThread}
            />
            <span className="relative min-w-0 flex-1 truncate" title={accessibleTitle}>
              {title}
            </span>
          </>
        )}
        {!editing ? (
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-end max-md:pointer-coarse:h-10 max-md:pointer-coarse:w-10">
            <span
              data-sidebar-hover-actions-open={actionsOpen ? "true" : undefined}
              className="bb-sidebar-hover-actions-fade absolute inset-0 flex items-center justify-center text-subtle-foreground"
            >
              {layout ? (
                <SplitPaneMiniMap
                  layout={layout}
                  label={`${title} — open in split`}
                />
              ) : (
                <ThreadIndicator
                  indicator={thread.indicator}
                  label={thread.indicatorLabel}
                />
              )}
            </span>
            <span
              data-sidebar-hover-actions-open={actionsOpen ? "true" : undefined}
              className="bb-sidebar-hover-actions absolute inset-0 z-10 flex items-center justify-end max-md:pointer-coarse:hidden"
            >
              <ThreadActionsDropdown
                {...commonMenuProps}
                onOpenChange={setDropdownOpen}
              />
            </span>
          </span>
        ) : null}
      </div>
    </li>
  );

  return (
    <ThreadActionsContextMenu
      {...commonMenuProps}
      onOpenChange={setContextOpen}
    >
      {row}
    </ThreadActionsContextMenu>
  );
}

interface TaskStatusSectionProps {
  children: React.ReactNode;
  collapsed: boolean;
  dropTarget: boolean;
  onDropAtEnd: (event: DragEvent<HTMLElement>) => void;
  onDragOverEnd: (event: DragEvent<HTMLElement>) => void;
  onToggle: () => void;
  status: ThreadStatus;
  threads: readonly PluginSidebarThread[];
}

function TaskStatusSection({
  children,
  collapsed,
  dropTarget,
  onDropAtEnd,
  onDragOverEnd,
  onToggle,
  status,
  threads,
}: TaskStatusSectionProps) {
  const activityThread = collapsed ? groupIndicator(threads) : null;
  const id = `thread-task-status-${status.replace(/\s/g, "-")}`;
  return (
    <section
      data-sidebar-sticky-group=""
      aria-labelledby={id}
      className={`group/sidebar-section min-w-0 rounded-md transition-colors ${
        dropTarget ? "bg-sidebar-accent/60" : ""
      }`}
      onDragOver={onDragOverEnd}
      onDrop={onDropAtEnd}
    >
      <div
        data-sidebar="group-label"
        data-sidebar-sticky-tier="label"
        className="bb-sidebar-hover-actions-row sticky top-0 z-[60] flex h-7 items-center rounded-md bg-sidebar pl-2 pr-0 text-xs font-normal leading-5 text-subtle-foreground/75 transition-colors max-md:pointer-coarse:h-10"
      >
        <span className="relative z-10 flex min-w-0 flex-1 items-center gap-1 text-left">
          <span id={id} className="min-w-0 truncate" title={status}>
            {status}
          </span>
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${status} section` : `Collapse ${status} section`}
            className={`relative z-20 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 ${
              collapsed ? "" : "bb-sidebar-hover-actions"
            }`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggle();
            }}
            onDragStart={(event) => event.preventDefault()}
          >
            <Icon
              name="ChevronRight"
              className={`size-3 transition-transform duration-150 ${
                collapsed ? "" : "rotate-90"
              }`}
              aria-hidden
            />
          </button>
        </span>
        {activityThread ? (
          <span className="pointer-events-none absolute right-2 top-1/2 z-20 inline-flex -translate-y-1/2 items-center text-subtle-foreground">
            <ThreadIndicator
              indicator={activityThread.indicator}
              label={activityThread.indicatorLabel}
            />
          </span>
        ) : null}
      </div>
      {collapsed ? null : <div className="mt-1">{children}</div>}
    </section>
  );
}

function LoadingState() {
  return (
    <div
      aria-label="Loading sidebar navigation"
      className="space-y-1.5 px-2 pt-1"
    >
      {["w-2/3", "w-1/2"].map((width) => (
        <div key={width} className="flex h-7 animate-pulse items-center gap-2 rounded-md">
          <span className="size-4 shrink-0 rounded-md bg-sidebar-border/60" />
          <span className={`h-3 ${width} rounded-sm bg-sidebar-border/50`} />
        </div>
      ))}
    </div>
  );
}

function ThreadStatusList({
  activeThreadId,
  onNavigate,
  searchQuery,
}: PluginThreadListProps) {
  const rpc = useRpc<typeof rpcContract>();
  const sidebar = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const connectionState = useRealtimeConnectionState();
  const [organization, setOrganization] = useState<OrganizationState>({
    assignments: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [dropAfter, setDropAfter] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<ThreadStatus | null>(null);
  const [collapsed, setCollapsed] = useState<Set<ThreadStatus>>(() => new Set());
  const [mutationPending, setMutationPending] = useState(false);
  const wasConnected = useRef(false);
  const syncInFlight = useRef(false);

  const clearDrag = useCallback(() => {
    setDraggingThreadId(null);
    setDropBefore(null);
    setDropAfter(null);
    setDropStatus(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await rpc.call("listState");
      setOrganization(state);
      setError(null);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tasks.");
      setLoaded(true);
    }
  }, [rpc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtime("state-changed", () => {
    void refresh();
  });

  useEffect(() => {
    if (connectionState === "connected" && wasConnected.current) void refresh();
    wasConnected.current = connectionState === "connected";
  }, [connectionState, refresh]);

  const visibleThreads = useMemo(
    () => sidebar.threads.filter((thread) => !thread.isArchived),
    [sidebar.threads],
  );
  const unsyncedThreadIds = useMemo(() => {
    const assigned = new Set(
      organization.assignments.map((assignment) => assignment.threadId),
    );
    return visibleThreads
      .map((thread) => thread.id)
      .filter((threadId) => !assigned.has(threadId));
  }, [organization.assignments, visibleThreads]);

  useEffect(() => {
    if (
      !loaded ||
      sidebar.status === "loading" ||
      sidebar.status === "error" ||
      unsyncedThreadIds.length === 0 ||
      syncInFlight.current
    ) {
      return;
    }
    syncInFlight.current = true;
    void rpc
      .call("syncThreads", { threadIds: visibleThreads.map((thread) => thread.id) })
      .then((state) => {
        setOrganization(state);
        setError(null);
      })
      .catch((cause) => {
        setError(
          cause instanceof Error ? cause.message : "Could not save task order.",
        );
      })
      .finally(() => {
        syncInFlight.current = false;
      });
  }, [loaded, rpc, sidebar.status, unsyncedThreadIds.length, visibleThreads]);

  const groups = useMemo(
    () => groupThreadsByStatus(visibleThreads, organization.assignments),
    [organization.assignments, visibleThreads],
  );
  const projectNames = useMemo(
    () => new Map(sidebar.projects.map((project) => [project.id, project.name])),
    [sidebar.projects],
  );
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  const matchesSearch = useCallback(
    (thread: PluginSidebarThread) => {
      if (!normalizedSearch) return true;
      const haystack = [
        threadTitle(thread),
        projectNames.get(thread.projectId),
        thread.environment?.branchName,
        thread.host?.name,
        thread.providerId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(normalizedSearch);
    },
    [normalizedSearch, projectNames],
  );

  const commitMove = useCallback(
    async (
      threadId: string,
      status: ThreadStatus,
      beforeThreadId: string | null,
    ) => {
      if (mutationPending || unsyncedThreadIds.length > 0) return;
      const order = destinationOrder(
        groups[status].map((thread) => thread.id),
        threadId,
        beforeThreadId,
      );
      const movedIndex = order.indexOf(threadId);
      setMutationPending(true);
      setError(null);
      try {
        const state = await rpc.call("moveThread", {
          threadId,
          taskStatus: status,
          previousThreadId: order[movedIndex - 1] ?? null,
          nextThreadId: order[movedIndex + 1] ?? null,
        });
        setOrganization(state);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not move the task.",
        );
        await refresh();
      } finally {
        setMutationPending(false);
        clearDrag();
      }
    },
    [clearDrag, groups, mutationPending, refresh, rpc, unsyncedThreadIds.length],
  );

  function toggleCollapsed(status: ThreadStatus): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  if (sidebar.status === "loading" || !loaded) return <LoadingState />;
  if (sidebar.status === "error") {
    return (
      <p role="status" className="px-2 py-6 text-center text-xs text-muted-foreground">
        Could not load threads.
      </p>
    );
  }

  const matchedCount = visibleThreads.filter(matchesSearch).length;
  if (matchedCount === 0) {
    return (
      <p role="status" className="px-2 py-6 text-center text-xs text-muted-foreground">
        {normalizedSearch ? "No threads found" : "No threads yet"}
      </p>
    );
  }

  return (
    <div
      data-sidebar="group"
      data-sidebar-sticky-stack=""
      data-sidebar-sticky-density="compact-actions"
      className="relative flex w-full min-w-0 flex-col px-2 pb-3"
      onDragEnd={clearDrag}
    >
      {error ? (
        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      {THREAD_STATUSES.map((status) => {
        const allThreads = groups[status];
        const shownThreads = allThreads.filter(matchesSearch);
        const isCollapsed = collapsed.has(status);
        if (normalizedSearch && shownThreads.length === 0) return null;
        return (
          <TaskStatusSection
            key={status}
            status={status}
            threads={shownThreads}
            collapsed={isCollapsed}
            dropTarget={
              dropStatus === status && dropBefore === null && dropAfter === null
            }
            onToggle={() => toggleCollapsed(status)}
            onDragOverEnd={(event) => {
              if (!draggingThreadId) return;
              event.preventDefault();
              setDropStatus(status);
              setDropBefore(null);
              setDropAfter(null);
            }}
            onDropAtEnd={(event) => {
              if (!draggingThreadId) return;
              event.preventDefault();
              void commitMove(draggingThreadId, status, null);
            }}
          >
            <ul>
              {shownThreads.map((thread) => {
                const fullIndex = allThreads.findIndex(
                  (item) => item.id === thread.id,
                );
                return (
                  <ThreadRow
                    key={thread.id}
                    actions={actions}
                    active={thread.id === activeThreadId}
                    canMoveDown={fullIndex < allThreads.length - 1}
                    canMoveUp={fullIndex > 0}
                    disabled={mutationPending || unsyncedThreadIds.length > 0}
                    dragging={thread.id === draggingThreadId}
                    onChangeStatus={(nextStatus) => {
                      void commitMove(thread.id, nextStatus, null);
                    }}
                    onDragEnd={clearDrag}
                    onDragOver={(event) => {
                      setDropStatus(status);
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const isAfter = event.clientY > bounds.top + bounds.height / 2;
                      if (isAfter) {
                        setDropBefore(allThreads[fullIndex + 1]?.id ?? null);
                        setDropAfter(thread.id);
                      } else {
                        setDropBefore(thread.id);
                        setDropAfter(null);
                      }
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", thread.id);
                      setDraggingThreadId(thread.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!draggingThreadId) return;
                      void commitMove(draggingThreadId, status, dropBefore);
                    }}
                    onMoveDown={() => {
                      const before = allThreads[fullIndex + 2]?.id ?? null;
                      void commitMove(thread.id, status, before);
                    }}
                    onMoveUp={() => {
                      void commitMove(
                        thread.id,
                        status,
                        allThreads[fullIndex - 1]?.id ?? null,
                      );
                    }}
                    onNavigate={onNavigate}
                    projectName={projectNames.get(thread.projectId) ?? null}
                    showDropAfter={
                      dropStatus === status && dropAfter === thread.id
                    }
                    showDropBefore={
                      dropStatus === status &&
                      dropAfter === null &&
                      dropBefore === thread.id
                    }
                    taskStatus={status}
                    thread={thread}
                  />
                );
              })}
            </ul>
          </TaskStatusSection>
        );
      })}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "thread-status",
    title: "Thread Tasks",
    description: "Treat threads as manually ordered tasks grouped by task status.",
    component: ThreadStatusList,
  });
});
