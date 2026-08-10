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
import { usePersistentStringSet } from "./persistent-string-set";
import { shouldSyncThreads } from "./task-sync";
import { flattenThreadHierarchy } from "./thread-hierarchy";

const COLLAPSED_STATUSES_STORAGE_KEY =
  "bb.plugin.thread-status.collapsedStatuses";
const COLLAPSED_THREADS_STORAGE_KEY =
  "bb.plugin.thread-status.collapsedThreads";
const THREAD_STATUS_SET: ReadonlySet<string> = new Set(THREAD_STATUSES);

interface OrganizationState {
  assignments: ThreadAssignment[];
}

type SearchState =
  | { query: ""; status: "idle"; threads: readonly SearchThread[] }
  | { query: string; status: "loading"; threads: readonly SearchThread[] }
  | { query: string; status: "ready"; threads: readonly SearchThread[] }
  | { query: string; status: "error"; threads: readonly SearchThread[] };

interface SearchThread {
  id: string;
  projectId: string;
  title: string | null;
  titleFallback: string | null;
  parentThreadId: string | null;
  providerId: string;
  isArchived: boolean;
}

function archivedSearchThread(thread: SearchThread): PluginSidebarThread {
  return {
    ...thread,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    environment: null,
    host: null,
    createdAt: 0,
    updatedAt: 0,
    lastReadAt: null,
    latestAttentionAt: 0,
  };
}

interface ThreadRowProps {
  actions: PluginSidebarThreadActions;
  active: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  disabled: boolean;
  dragging: boolean;
  depth: number;
  hasChildren: boolean;
  childrenCollapsed: boolean;
  indicatorThread: PluginSidebarThread;
  onChangeStatus: (status: ThreadStatus) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onNavigate: () => void;
  onToggleChildren: () => void;
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
  depth,
  hasChildren,
  childrenCollapsed,
  indicatorThread,
  onChangeStatus,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onNavigate,
  onToggleChildren,
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
    if (thread.isArchived) {
      window.location.assign(
        `/projects/${encodeURIComponent(thread.projectId)}/threads/${encodeURIComponent(thread.id)}`,
      );
      onNavigate();
      return;
    }
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
        className={`bb-sidebar-hover-actions-row group/thread-row relative flex h-7 w-full items-center gap-2 rounded-md pr-0 text-sm transition-colors max-md:pointer-coarse:h-10 ${
          active
            ? "bg-state-active text-sidebar-foreground"
            : "cursor-pointer text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground"
        } ${!active && layout !== null ? "bg-sidebar-accent/50" : ""} ${
          dragging ? "opacity-40" : ""
        } ${disabled ? "" : "select-none"}`}
        draggable={!disabled && !editing && !thread.isArchived}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        style={{ paddingLeft: 8 + depth * 24 }}
      >
        {Array.from({ length: depth }, (_, level) => (
          <span
            key={level}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-border-hairline opacity-70"
            style={{ left: 16 + level * 24 }}
          />
        ))}
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
              href={`/projects/${encodeURIComponent(thread.projectId)}/threads/${encodeURIComponent(thread.id)}`}
              onClick={openThread}
            />
            <span className="relative flex min-w-0 flex-1 items-center gap-1.5">
              <span className="min-w-0 truncate" title={accessibleTitle}>
                {title}
              </span>
              {projectName ? (
                <span
                  className="max-w-24 shrink truncate text-[11px] text-subtle-foreground/75"
                  title={projectName}
                >
                  {projectName}
                </span>
              ) : null}
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={!childrenCollapsed}
                  aria-label={
                    childrenCollapsed
                      ? `Expand ${title} threads`
                      : `Collapse ${title} threads`
                  }
                  className="bb-sidebar-hover-actions relative z-20 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleChildren();
                  }}
                >
                  <Icon
                    name="ChevronRight"
                    className={`size-3 transition-transform duration-150 ${
                      childrenCollapsed ? "" : "rotate-90"
                    }`}
                    aria-hidden
                  />
                </button>
              ) : null}
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
                  indicator={indicatorThread.indicator}
                  label={indicatorThread.indicatorLabel}
                />
              )}
            </span>
            {!thread.isArchived ? (
              <span
                data-sidebar-hover-actions-open={
                  actionsOpen ? "true" : undefined
                }
                className="bb-sidebar-hover-actions absolute inset-0 z-10 flex items-center justify-end max-md:pointer-coarse:hidden"
              >
                <ThreadActionsDropdown
                  {...commonMenuProps}
                  onOpenChange={setDropdownOpen}
                />
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </li>
  );

  if (thread.isArchived) return row;

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

function SidebarMessage({
  action,
  children,
}: {
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-2 flex min-h-8 items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1">{children}</span>
      {action ? (
        <button
          type="button"
          className="shrink-0 rounded-md px-2 py-1 text-xs text-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
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
  const [organization, setOrganization] = useState<OrganizationState | null>(
    null,
  );
  const organizationLoaded = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchState>({
    query: "",
    status: "idle",
    threads: [],
  });
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [dropAfter, setDropAfter] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<ThreadStatus | null>(null);
  const [collapsedStatuses, setCollapsedStatuses] = usePersistentStringSet(
    COLLAPSED_STATUSES_STORAGE_KEY,
    THREAD_STATUS_SET,
  );
  const [collapsedThreads, setCollapsedThreads] = usePersistentStringSet(
    COLLAPSED_THREADS_STORAGE_KEY,
  );
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
      const state = await rpc.call("listState", null);
      setOrganization(state);
      organizationLoaded.current = true;
      setLoadError(null);
      setError(null);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not load tasks.";
      if (organizationLoaded.current) setError(message);
      else setLoadError(message);
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

  const taskThreads = useMemo(
    () => sidebar.threads.filter((thread) => !thread.isArchived),
    [sidebar.threads],
  );
  const unsyncedThreadIds = useMemo(() => {
    const assigned = new Set(
      (organization?.assignments ?? []).map(
        (assignment) => assignment.threadId,
      ),
    );
    return taskThreads
      .map((thread) => thread.id)
      .filter((threadId) => !assigned.has(threadId));
  }, [organization?.assignments, taskThreads]);

  useEffect(() => {
    if (
      !shouldSyncThreads({
        hasOrganization: organization !== null,
        loadError,
        sidebarStatus: sidebar.status,
        syncInFlight: syncInFlight.current,
        unsyncedCount: unsyncedThreadIds.length,
      })
    ) {
      return;
    }
    syncInFlight.current = true;
    void rpc
      .call("syncThreads", { threadIds: taskThreads.map((thread) => thread.id) })
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
  }, [
    loadError,
    organization,
    rpc,
    sidebar.status,
    taskThreads,
    unsyncedThreadIds.length,
  ]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  useEffect(() => {
    if (!normalizedSearch) {
      setSearch({ query: "", status: "idle", threads: [] });
      return;
    }
    let canceled = false;
    const timeout = window.setTimeout(() => {
      setSearch({ query: normalizedSearch, status: "loading", threads: [] });
      void rpc
        .call("searchThreads", { query: searchQuery.trim() })
        .then(({ threads }) => {
          if (!canceled) {
            setSearch({
              query: normalizedSearch,
              status: "ready",
              threads,
            });
          }
        })
        .catch(() => {
          if (!canceled) {
            setSearch({
              query: normalizedSearch,
              status: "error",
              threads: [],
            });
          }
        });
    }, 150);
    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [normalizedSearch, rpc, searchQuery]);

  const displayThreads = useMemo(() => {
    if (!normalizedSearch) return taskThreads;
    if (search.query !== normalizedSearch || search.status !== "ready") return [];
    const liveThreads = new Map(
      sidebar.threads.map((thread) => [thread.id, thread] as const),
    );
    return search.threads.map(
      (thread) => liveThreads.get(thread.id) ?? archivedSearchThread(thread),
    );
  }, [normalizedSearch, search, sidebar.threads, taskThreads]);
  const groups = useMemo(
    () => groupThreadsByStatus(displayThreads, organization?.assignments ?? []),
    [displayThreads, organization?.assignments],
  );
  const projectNames = useMemo(
    () => new Map(sidebar.projects.map((project) => [project.id, project.name])),
    [sidebar.projects],
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
    setCollapsedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleThreadCollapsed(threadId: string): void {
    setCollapsedThreads((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }

  if (
    sidebar.status === "loading" ||
    (organization === null && loadError === null)
  ) {
    return <LoadingState />;
  }
  if (sidebar.status === "error") {
    return <SidebarMessage>Could not load threads.</SidebarMessage>;
  }
  if (organization === null) {
    return (
      <SidebarMessage
        action={{
          label: "Retry",
          onClick: () => {
            setLoadError(null);
            void refresh();
          },
        }}
      >
        Could not load tasks.
      </SidebarMessage>
    );
  }

  if (
    normalizedSearch &&
    (search.query !== normalizedSearch || search.status === "loading")
  ) {
    return <SidebarMessage>Searching threads...</SidebarMessage>;
  }
  if (normalizedSearch && search.status === "error") {
    return <SidebarMessage>Search failed.</SidebarMessage>;
  }
  if (displayThreads.length === 0) {
    return (
      <SidebarMessage>
        {normalizedSearch ? "No matching threads" : "No threads yet"}
      </SidebarMessage>
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
        const shownThreads = allThreads;
        const idsInStatus = new Set(allThreads.map((thread) => thread.id));
        const hierarchyRows = normalizedSearch
          ? shownThreads.map((thread) => ({
              thread,
              depth: 0,
              hasChildren: false,
              descendants: [] as readonly PluginSidebarThread[],
            }))
          : flattenThreadHierarchy(shownThreads, collapsedThreads);
        const isCollapsed = collapsedStatuses.has(status);
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
              {hierarchyRows.map(
                ({ thread, depth, hasChildren, descendants }) => {
                  const fullIndex = allThreads.findIndex(
                    (item) => item.id === thread.id,
                  );
                  const effectiveParentId =
                    thread.parentThreadId !== null &&
                    idsInStatus.has(thread.parentThreadId)
                      ? thread.parentThreadId
                      : null;
                  const siblings = allThreads.filter((item) => {
                    const parentId =
                      item.parentThreadId !== null &&
                      idsInStatus.has(item.parentThreadId)
                        ? item.parentThreadId
                        : null;
                    return parentId === effectiveParentId;
                  });
                  const siblingIndex = siblings.findIndex(
                    (item) => item.id === thread.id,
                  );
                  const childrenCollapsed = collapsedThreads.has(thread.id);
                  const indicatorThread =
                    childrenCollapsed && hasChildren
                      ? (groupIndicator([thread, ...descendants]) ?? thread)
                      : thread;
                  return (
                    <ThreadRow
                      key={thread.id}
                      actions={actions}
                      active={thread.id === activeThreadId}
                      canMoveDown={siblingIndex < siblings.length - 1}
                      canMoveUp={siblingIndex > 0}
                      childrenCollapsed={childrenCollapsed}
                      depth={depth}
                      disabled={
                        Boolean(normalizedSearch) ||
                        mutationPending ||
                        unsyncedThreadIds.length > 0
                      }
                      dragging={thread.id === draggingThreadId}
                      hasChildren={hasChildren}
                      indicatorThread={indicatorThread}
                      onChangeStatus={(nextStatus) => {
                        void commitMove(thread.id, nextStatus, null);
                      }}
                      onDragEnd={clearDrag}
                      onDragOver={(event) => {
                        setDropStatus(status);
                        const bounds =
                          event.currentTarget.getBoundingClientRect();
                        const isAfter =
                          event.clientY > bounds.top + bounds.height / 2;
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
                        const afterNextSibling = siblings[siblingIndex + 2];
                        const before =
                          afterNextSibling?.id ??
                          allThreads[
                            allThreads.findIndex(
                              (item) =>
                                item.id === siblings[siblingIndex + 1]?.id,
                            ) + 1
                          ]?.id ??
                          null;
                        void commitMove(thread.id, status, before);
                      }}
                      onMoveUp={() => {
                        void commitMove(
                          thread.id,
                          status,
                          siblings[siblingIndex - 1]?.id ?? null,
                        );
                      }}
                      onNavigate={onNavigate}
                      onToggleChildren={() =>
                        toggleThreadCollapsed(thread.id)
                      }
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
                },
              )}
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
