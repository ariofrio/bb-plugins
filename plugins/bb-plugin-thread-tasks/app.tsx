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
  type MouseEvent,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import type { rpcContract } from "./server";
import {
  DEFAULT_THREAD_STATUS,
  THREAD_STATUSES,
  destinationOrder,
  groupThreadsByStatus,
  type ThreadAssignment,
  type ThreadStatus,
} from "./thread-status";
import { buildPinnedThreadState } from "./pinned-threads";
import { Icon } from "./components/Icon";
import { TaskStatusIcon } from "./components/TaskStatusIcon";
import {
  ThreadActionsContextMenu,
  ThreadActionsDropdown,
} from "./components/ThreadActionsMenu";
import {
  groupIndicator,
  ThreadIndicator,
} from "./components/ThreadIndicator";
import { SplitPaneMiniMap } from "./components/SplitPaneMiniMap";
import { ThreadRenameDialog } from "./components/ThreadRenameDialog";
import { createNativeCommandDelegate } from "./native-command-delegation";
import { notifyNativeShortcutHandled } from "./native-command-hints";
import { usePersistentStringSet } from "./persistent-string-set";
import {
  fetchProjectIcons,
  subscribeToProjectIconChanges,
  type ProjectIconView,
} from "./project-icons";
import { shouldSyncThreads } from "./task-sync";
import {
  partitionTaskThreads,
  withThreadAncestors,
} from "./task-ownership";
import {
  currentThreadId,
  taskReorderShortcut,
  taskStatusShortcut,
} from "./task-shortcuts";
import {
  canDropThreadBeside,
  effectiveHierarchyParentId,
  flattenThreadHierarchy,
} from "./thread-hierarchy";

const COLLAPSED_STATUSES_STORAGE_KEY =
  "bb.plugin.thread-status.collapsedStatuses";
const COLLAPSED_THREADS_STORAGE_KEY = "bb.sidebar.collapsedThreads";
const PINNED_SECTION = "Pinned" as const;
type SidebarGroup = ThreadStatus | typeof PINNED_SECTION;
const COLLAPSIBLE_SECTION_SET: ReadonlySet<string> = new Set([
  PINNED_SECTION,
  ...THREAD_STATUSES,
]);

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
  onNavigate: () => void;
  onToggleChildren: () => void;
  preview: string | null;
  projectIcon: ProjectIconView | null;
  reorderable: boolean;
  showDropAfter: boolean;
  showDropBefore: boolean;
  taskStatus: ThreadStatus | null;
  thread: PluginSidebarThread;
}

function threadTitle(thread: PluginSidebarThread): string {
  return thread.title ?? thread.titleFallback ?? "Untitled thread";
}

function ThreadRow({
  actions,
  active,
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
  onNavigate,
  onToggleChildren,
  preview,
  projectIcon,
  reorderable,
  showDropAfter,
  showDropBefore,
  taskStatus,
  thread,
}: ThreadRowProps) {
  const { splitProps, isAvailable: splitAvailable, layout } =
    experimental_useSidebarThreadSplit(thread.id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const title = threadTitle(thread);
  const accessibleTitle = preview ? `${title} — ${preview}` : title;
  const actionsOpen = dropdownOpen || contextOpen;

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

  const commonMenuProps = {
    actions,
    disabled,
    onRename: () =>
      window.setTimeout(() => {
        setRenameOpen(true);
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
        className={`bb-sidebar-hover-actions-row group/thread-row relative flex h-11 w-full items-center gap-2 rounded-md py-0.5 pr-0 text-sm transition-colors max-md:pointer-coarse:h-[52px] ${
          active
            ? "bg-state-active text-sidebar-foreground"
            : "cursor-pointer text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground"
        } ${!active && layout !== null ? "bg-sidebar-accent/50" : ""} ${
          dragging ? "opacity-40" : ""
        } ${disabled ? "" : "select-none"}`}
        draggable={reorderable && !disabled && !thread.isArchived}
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
        <a
          {...splitProps}
          aria-label={`Open ${accessibleTitle}`}
          className="absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
          data-sidebar-thread-id={thread.id}
          data-sidebar-thread-shortcut-target=""
          draggable={false}
          href={`/projects/${encodeURIComponent(thread.projectId)}/threads/${encodeURIComponent(thread.id)}`}
          onClick={openThread}
        />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {projectIcon === null ? null : (
            <HugeiconsIcon
              icon={projectIcon.glyph}
              className={`size-4 shrink-0 ${projectIcon.color === null ? "text-muted-foreground/70" : ""}`}
              style={projectIcon.color === null ? undefined : { color: projectIcon.color }}
              data-project-icon={projectIcon.name}
              aria-hidden
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col justify-center leading-none">
            <span className="truncate leading-5" title={accessibleTitle}>
              {title}
            </span>
            {preview ? (
              <span
                className="truncate text-[11px] leading-4 text-subtle-foreground/75"
                title={preview}
              >
                {preview}
              </span>
            ) : null}
          </span>
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
        <span className="relative flex h-10 w-7 shrink-0 items-center justify-end max-md:pointer-coarse:h-12 max-md:pointer-coarse:w-9">
          <span
            data-sidebar-hover-actions-open={actionsOpen ? "true" : undefined}
            className="bb-sidebar-hover-actions-fade absolute inset-0 flex items-center justify-center text-subtle-foreground"
          >
            {layout ? (
              <span
                data-sidebar-thread-trailing-indicator=""
                className="inline-flex size-4 shrink-0 items-center justify-center"
              >
                <SplitPaneMiniMap
                  layout={layout}
                  label={
                    indicatorThread.indicatorLabel
                      ? `${title} — open in split; ${indicatorThread.indicatorLabel}`
                      : `${title} — open in split`
                  }
                  isWorking={[
                    "working-draft",
                    "workflow",
                    "background-agent",
                    "background-command",
                    "plan-mode",
                    "goal",
                    "runtime",
                  ].includes(indicatorThread.indicator)}
                />
              </span>
            ) : indicatorThread.indicator !== "none" ? (
              <span
                data-sidebar-thread-trailing-indicator=""
                className="inline-flex size-4 shrink-0 items-center justify-center"
              >
                <ThreadIndicator
                  indicator={indicatorThread.indicator}
                  label={indicatorThread.indicatorLabel}
                />
              </span>
            ) : null}
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
      </div>
    </li>
  );

  if (thread.isArchived) return row;

  return (
    <>
      <ThreadActionsContextMenu
        {...commonMenuProps}
        onOpenChange={setContextOpen}
      >
        {row}
      </ThreadActionsContextMenu>
      <ThreadRenameDialog
        currentTitle={title}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onRename={(nextTitle) => actions.rename(thread.id, nextTitle)}
      />
    </>
  );
}

interface SidebarSectionProps {
  children: React.ReactNode;
  collapsed: boolean;
  dropTarget: boolean;
  onDropAtEnd: (event: DragEvent<HTMLElement>) => void;
  onDragOverEnd: (event: DragEvent<HTMLElement>) => void;
  onToggle: () => void;
  label: SidebarGroup;
  threads: readonly PluginSidebarThread[];
}

function SidebarSection({
  children,
  collapsed,
  dropTarget,
  onDropAtEnd,
  onDragOverEnd,
  onToggle,
  label,
  threads,
}: SidebarSectionProps) {
  const activityThread = collapsed ? groupIndicator(threads) : null;
  const id = `thread-task-group-${label.replace(/\s/g, "-")}`;
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
        className="bb-sidebar-hover-actions-row sticky top-0 z-[60] flex h-6 items-center rounded-md bg-sidebar pl-2 pr-0 text-xs font-normal leading-5 text-subtle-foreground/75 transition-colors max-md:pointer-coarse:h-9"
      >
        <span className="relative z-10 flex min-w-0 flex-1 items-center gap-1 text-left">
          {label === PINNED_SECTION ? null : (
            <TaskStatusIcon status={label} className="mr-1 size-4 shrink-0" />
          )}
          <span id={id} className="min-w-0 truncate" title={label}>
            {label}
          </span>
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? `Expand ${label} section`
                : `Collapse ${label} section`
            }
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
  icon,
  isLoading = false,
}: {
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  icon: "AlertCircle" | "CircleQuestion" | "Loading";
  isLoading?: boolean;
}) {
  return (
    <div className="mx-2 flex min-h-8 items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
      <Icon
        name={icon}
        className={`size-4 shrink-0 ${isLoading ? "animate-spin" : ""}`}
        aria-hidden
      />
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
  const [previews, setPreviews] = useState<ReadonlyMap<string, string | null>>(
    () => new Map(),
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
  const [dropGroup, setDropGroup] = useState<SidebarGroup | null>(null);
  const [collapsedSections, setCollapsedSections] = usePersistentStringSet(
    COLLAPSED_STATUSES_STORAGE_KEY,
    COLLAPSIBLE_SECTION_SET,
  );
  const [collapsedThreads, setCollapsedThreads] = usePersistentStringSet(
    COLLAPSED_THREADS_STORAGE_KEY,
  );
  const [mutationPending, setMutationPending] = useState(false);
  const [pinnedThreadIds, setPinnedThreadIds] = useState<readonly string[]>([]);
  const wasConnected = useRef(false);
  const syncInFlight = useRef(false);

  const clearDrag = useCallback(() => {
    setDraggingThreadId(null);
    setDropBefore(null);
    setDropAfter(null);
    setDropGroup(null);
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

  const refreshPreviews = useCallback(async () => {
    try {
      const result = await rpc.call("listPreviews", null);
      setPreviews(
        new Map(
          result.previews.map((preview) => [
            preview.threadId,
            preview.preview,
          ]),
        ),
      );
    } catch {
      // A missing preview is a valid transient state while the backend catches
      // up; task organization remains usable without secondary text.
    }
  }, [rpc]);

  useEffect(() => {
    void refresh();
    void refreshPreviews();
  }, [refresh, refreshPreviews]);

  useRealtime("state-changed", () => {
    void refresh();
  });

  useRealtime("previews-changed", () => {
    void refreshPreviews();
  });

  useEffect(() => {
    if (connectionState === "connected" && wasConnected.current) {
      void refresh();
      void refreshPreviews();
    }
    wasConnected.current = connectionState === "connected";
  }, [connectionState, refresh, refreshPreviews]);

  const taskThreads = useMemo(
    () => sidebar.threads.filter((thread) => !thread.isArchived),
    [sidebar.threads],
  );
  const taskPartition = useMemo(
    () => partitionTaskThreads(taskThreads),
    [taskThreads],
  );

  const projectIds = useMemo(
    () => sidebar.projects.map((project) => project.id).sort().join(","),
    [sidebar.projects],
  );
  const [projectIcons, setProjectIcons] = useState<
    ReadonlyMap<string, ProjectIconView>
  >(new Map());
  useEffect(() => {
    let canceled = false;
    const load = () => {
      void fetchProjectIcons(projectIds.split(",").filter(Boolean)).then(
        (icons) => {
          if (!canceled) setProjectIcons(icons);
        },
      );
    };
    load();
    const unsubscribe = subscribeToProjectIconChanges(load);
    return () => {
      canceled = true;
      unsubscribe();
    };
  }, [projectIds]);
  const explicitPinnedThreadIds = useMemo(
    () =>
      taskThreads
        .filter((thread) => thread.isPinned)
        .map((thread) => thread.id),
    [taskThreads],
  );

  useEffect(() => {
    if (explicitPinnedThreadIds.length === 0) return;
    let canceled = false;
    void rpc
      .call("listPinnedThreadIds", null)
      .then(({ threadIds }) => {
        if (!canceled) setPinnedThreadIds(threadIds);
      })
      .catch(() => {
        // Live pin membership remains usable in source order when the
        // authoritative fractional order cannot be loaded.
      });
    return () => {
      canceled = true;
    };
  }, [explicitPinnedThreadIds, rpc]);

  const unsyncedThreadIds = useMemo(() => {
    const assigned = new Set(
      (organization?.assignments ?? []).map(
        (assignment) => assignment.threadId,
      ),
    );
    return [
      ...taskPartition.taskThreads
        .map((thread) => thread.id)
        .filter((threadId) => !assigned.has(threadId)),
      ...taskPartition.childThreads
        .map((thread) => thread.id)
        .filter((threadId) => assigned.has(threadId)),
    ];
  }, [organization?.assignments, taskPartition]);

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
      .call("syncThreads", {
        taskThreadIds: taskPartition.taskThreads.map((thread) => thread.id),
        childThreadIds: taskPartition.childThreads.map((thread) => thread.id),
      })
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
    taskPartition,
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
    const matches = search.threads.map(
      (thread) => liveThreads.get(thread.id) ?? archivedSearchThread(thread),
    );
    const allThreads = [
      ...sidebar.threads,
      ...matches.filter((thread) => !liveThreads.has(thread.id)),
    ];
    return withThreadAncestors(matches, allThreads);
  }, [normalizedSearch, search, sidebar.threads, taskThreads]);
  const pinnedState = useMemo(
    () => buildPinnedThreadState(displayThreads, pinnedThreadIds),
    [displayThreads, pinnedThreadIds],
  );
  const statusThreads = useMemo(
    () =>
      displayThreads.filter(
        (thread) => !pinnedState.effectivePinnedThreadIds.has(thread.id),
      ),
    [displayThreads, pinnedState.effectivePinnedThreadIds],
  );
  const groups = useMemo(
    () => groupThreadsByStatus(statusThreads, organization?.assignments ?? []),
    [organization?.assignments, statusThreads],
  );
  const assignmentByThreadId = useMemo(
    () =>
      new Map(
        (organization?.assignments ?? []).map((assignment) => [
          assignment.threadId,
          assignment,
        ]),
      ),
    [organization?.assignments],
  );
  const pinnedHierarchyRows = useMemo(
    () => flattenThreadHierarchy(pinnedState.pinnedThreads, collapsedThreads),
    [collapsedThreads, pinnedState.pinnedThreads],
  );
  const pinnedRootThreads = useMemo(
    () =>
      pinnedHierarchyRows
        .filter(({ depth }) => depth === 0)
        .map(({ thread }) => thread),
    [pinnedHierarchyRows],
  );
  const pinnedRootIds = useMemo(
    () => new Set(pinnedRootThreads.map((thread) => thread.id)),
    [pinnedRootThreads],
  );

  const commitMove = useCallback(
    async (
      threadId: string,
      status: ThreadStatus,
      beforeThreadId: string | null,
    ) => {
      if (mutationPending || unsyncedThreadIds.length > 0) return;
      const order = destinationOrder(
        flattenThreadHierarchy(groups[status], new Set<string>())
          .filter(({ depth }) => depth === 0)
          .map(({ thread }) => thread.id),
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

  const commitPinnedMove = useCallback(
    async (threadId: string, beforeThreadId: string | null) => {
      if (mutationPending || !pinnedRootIds.has(threadId)) return;
      const order = destinationOrder(
        pinnedRootThreads.map((thread) => thread.id),
        threadId,
        beforeThreadId,
      );
      const movedIndex = order.indexOf(threadId);
      setMutationPending(true);
      setError(null);
      try {
        const { threadIds } = await rpc.call("reorderPinnedThread", {
          threadId,
          previousThreadId: order[movedIndex - 1] ?? null,
          nextThreadId: order[movedIndex + 1] ?? null,
        });
        setPinnedThreadIds(threadIds);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not reorder the pinned thread.",
        );
      } finally {
        setMutationPending(false);
        clearDrag();
      }
    },
    [clearDrag, mutationPending, pinnedRootIds, pinnedRootThreads, rpc],
  );

  function toggleCollapsed(group: SidebarGroup): void {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
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
    return (
      <SidebarMessage icon="AlertCircle">Could not load threads.</SidebarMessage>
    );
  }
  if (organization === null) {
    return (
      <SidebarMessage
        icon="AlertCircle"
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
    return (
      <SidebarMessage icon="Loading" isLoading>
        Searching threads...
      </SidebarMessage>
    );
  }
  if (normalizedSearch && search.status === "error") {
    return <SidebarMessage icon="AlertCircle">Search failed.</SidebarMessage>;
  }
  if (displayThreads.length === 0) {
    return (
      <SidebarMessage icon="CircleQuestion">
        {normalizedSearch ? "No matching threads" : "No threads yet"}
      </SidebarMessage>
    );
  }

  return (
    <div
      data-sidebar="group"
      data-sidebar-sticky-stack=""
      data-sidebar-sticky-density="compact-actions"
      className="relative flex w-full min-w-0 flex-col"
      onDragEnd={clearDrag}
    >
      {error ? (
        <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      <div className="space-y-4">
        {pinnedState.pinnedThreads.length > 0 ? (
          <SidebarSection
            label={PINNED_SECTION}
            threads={pinnedState.pinnedThreads}
            collapsed={collapsedSections.has(PINNED_SECTION)}
            dropTarget={
              dropGroup === PINNED_SECTION &&
              dropBefore === null &&
              dropAfter === null
            }
            onToggle={() => toggleCollapsed(PINNED_SECTION)}
            onDragOverEnd={(event) => {
              if (!draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                return;
              }
              event.preventDefault();
              setDropGroup(PINNED_SECTION);
              setDropBefore(null);
              setDropAfter(null);
            }}
            onDropAtEnd={(event) => {
              if (!draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                return;
              }
              event.preventDefault();
              void commitPinnedMove(draggingThreadId, null);
            }}
          >
            <ul>
              {pinnedHierarchyRows.map(
                ({ thread, depth, hasChildren, descendants }) => {
                  const rootIndex = pinnedRootThreads.findIndex(
                    (item) => item.id === thread.id,
                  );
                  const isRoot = rootIndex >= 0;
                  const childrenCollapsed = collapsedThreads.has(thread.id);
                  const indicatorThread =
                    childrenCollapsed && hasChildren
                      ? (groupIndicator([thread, ...descendants]) ?? thread)
                      : thread;
                  const taskStatus =
                    isRoot
                      ? (assignmentByThreadId.get(thread.id)?.taskStatus ??
                        DEFAULT_THREAD_STATUS)
                      : null;
                  return (
                    <ThreadRow
                      key={thread.id}
                      actions={actions}
                      active={thread.id === activeThreadId}
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
                        if (
                          !isRoot ||
                          !draggingThreadId ||
                          !pinnedRootIds.has(draggingThreadId)
                        ) {
                          setDropGroup(null);
                          setDropBefore(null);
                          setDropAfter(null);
                          return;
                        }
                        setDropGroup(PINNED_SECTION);
                        const bounds =
                          event.currentTarget.getBoundingClientRect();
                        const isAfter =
                          event.clientY > bounds.top + bounds.height / 2;
                        if (isAfter) {
                          setDropBefore(
                            pinnedRootThreads[rootIndex + 1]?.id ?? null,
                          );
                          setDropAfter(thread.id);
                        } else {
                          setDropBefore(thread.id);
                          setDropAfter(null);
                        }
                      }}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", thread.id);
                        setDraggingThreadId(thread.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (
                          !isRoot ||
                          !draggingThreadId ||
                          !pinnedRootIds.has(draggingThreadId)
                        ) {
                          clearDrag();
                          return;
                        }
                        void commitPinnedMove(draggingThreadId, dropBefore);
                      }}
                      onNavigate={onNavigate}
                      onToggleChildren={() =>
                        toggleThreadCollapsed(thread.id)
                      }
                      preview={previews.get(thread.id) ?? null}
                      projectIcon={projectIcons.get(thread.projectId) ?? null}
                      reorderable={isRoot && !Boolean(normalizedSearch)}
                      showDropAfter={
                        dropGroup === PINNED_SECTION &&
                        dropAfter === thread.id
                      }
                      showDropBefore={
                        dropGroup === PINNED_SECTION &&
                        dropAfter === null &&
                        dropBefore === thread.id
                      }
                      taskStatus={taskStatus}
                      thread={thread}
                    />
                  );
                },
              )}
            </ul>
          </SidebarSection>
        ) : null}
        {THREAD_STATUSES.map((status) => {
          const allThreads = groups[status];
          const shownThreads = allThreads;
          const idsInStatus = new Set(allThreads.map((thread) => thread.id));
          const hierarchyRows = flattenThreadHierarchy(
            shownThreads,
            normalizedSearch ? new Set<string>() : collapsedThreads,
          );
          const rootThreads = flattenThreadHierarchy(
            allThreads,
            new Set<string>(),
          )
            .filter(({ depth }) => depth === 0)
            .map(({ thread }) => thread);
          const isCollapsed = collapsedSections.has(status);
          if (normalizedSearch && shownThreads.length === 0) return null;
          return (
            <SidebarSection
              key={status}
              label={status}
              threads={shownThreads}
              collapsed={isCollapsed}
              dropTarget={
                dropGroup === status && dropBefore === null && dropAfter === null
              }
              onToggle={() => toggleCollapsed(status)}
              onDragOverEnd={(event) => {
                if (
                  !draggingThreadId ||
                  pinnedRootIds.has(draggingThreadId)
                ) {
                  return;
                }
                event.preventDefault();
                setDropGroup(status);
                setDropBefore(null);
                setDropAfter(null);
              }}
              onDropAtEnd={(event) => {
                if (
                  !draggingThreadId ||
                  pinnedRootIds.has(draggingThreadId)
                ) {
                  return;
                }
                event.preventDefault();
                void commitMove(draggingThreadId, status, null);
              }}
            >
              <ul>
                {hierarchyRows.map(
                  ({ thread, depth, hasChildren, descendants }) => {
                    const rootIndex = rootThreads.findIndex(
                      (item) => item.id === thread.id,
                    );
                    const isRoot = rootIndex >= 0;
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
                          if (isRoot) {
                            void commitMove(thread.id, nextStatus, null);
                          }
                        }}
                        onDragEnd={clearDrag}
                        onDragOver={(event) => {
                          const draggedThread = taskThreads.find(
                            (item) => item.id === draggingThreadId,
                          );
                          if (
                            !isRoot ||
                            draggedThread === undefined ||
                            pinnedRootIds.has(draggedThread.id) ||
                            !canDropThreadBeside(
                              draggedThread,
                              thread,
                              idsInStatus,
                            )
                          ) {
                            setDropGroup(null);
                            setDropBefore(null);
                            setDropAfter(null);
                            return;
                          }
                          setDropGroup(status);
                          const bounds =
                            event.currentTarget.getBoundingClientRect();
                          const isAfter =
                            event.clientY > bounds.top + bounds.height / 2;
                          if (isAfter) {
                            setDropBefore(rootThreads[rootIndex + 1]?.id ?? null);
                            setDropAfter(thread.id);
                          } else {
                            setDropBefore(thread.id);
                            setDropAfter(null);
                          }
                        }}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", thread.id);
                          setDraggingThreadId(thread.id);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!draggingThreadId) return;
                          const draggedThread = taskThreads.find(
                            (item) => item.id === draggingThreadId,
                          );
                          if (
                            !isRoot ||
                            draggedThread === undefined ||
                            pinnedRootIds.has(draggedThread.id) ||
                            !canDropThreadBeside(
                              draggedThread,
                              thread,
                              idsInStatus,
                            )
                          ) {
                            clearDrag();
                            return;
                          }
                          void commitMove(draggingThreadId, status, dropBefore);
                        }}
                        onNavigate={onNavigate}
                        onToggleChildren={() =>
                          toggleThreadCollapsed(thread.id)
                        }
                        preview={previews.get(thread.id) ?? null}
                        projectIcon={projectIcons.get(thread.projectId) ?? null}
                        reorderable={isRoot && !Boolean(normalizedSearch)}
                        showDropAfter={
                          dropGroup === status && dropAfter === thread.id
                        }
                        showDropBefore={
                          dropGroup === status &&
                          dropAfter === null &&
                          dropBefore === thread.id
                        }
                        taskStatus={isRoot ? status : null}
                        thread={thread}
                      />
                    );
                  },
                )}
              </ul>
            </SidebarSection>
          );
        })}
      </div>
    </div>
  );
}

type RpcEnvelope<Result> =
  | { ok: true; result: Result }
  | { ok: false; error: unknown };

function rpcErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

const ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY = "bb.root-compose.project-id";
const PERSONAL_PROJECT_ID = "proj_personal";

type ChordDestination =
  | { kind: "stay" }
  | { kind: "thread"; threadId: string; projectId: string | null }
  | { kind: "compose" };

/** Routes bb's SPA without a reload, and only in this client. */
function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
}

function goTo(
  destination: ChordDestination,
  openComposer: () => void,
): void {
  if (destination.kind === "stay") return;
  if (destination.kind === "thread") {
    // Personal-project threads route without a project segment; the
    // project-scoped path redirects to the compose screen.
    const projectless =
      destination.projectId === null ||
      destination.projectId === PERSONAL_PROJECT_ID;
    navigate(
      projectless
        ? `/threads/${encodeURIComponent(destination.threadId)}`
        : `/projects/${encodeURIComponent(destination.projectId ?? "")}/threads/${encodeURIComponent(destination.threadId)}`,
    );
    return;
  }
  const oldValue = window.localStorage.getItem(
    ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
  );
  window.localStorage.setItem(
    ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
    PERSONAL_PROJECT_ID,
  );
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
      newValue: PERSONAL_PROJECT_ID,
      oldValue,
      storageArea: window.localStorage,
      url: window.location.href,
    }),
  );
  // The compose surface is a state of the root route, not a path of its own,
  // so ask bb to open it the way its own New thread command does.
  openComposer();
}

async function callTaskRpc(
  pluginId: string,
  method: "setTaskStatus" | "reorderTask",
  input: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      credentials: "same-origin",
    },
  );
  const envelope = (await response.json()) as RpcEnvelope<unknown>;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok
        ? rpcErrorMessage(envelope.error, "Failed to move the task")
        : `Task request failed (${response.status})`,
    );
  }
  return envelope.result;
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "thread-status",
    title: "Thread tasks",
    description:
      "Treat root threads as manually ordered tasks grouped by task status.",
    component: ThreadStatusList,
  });

  app.contentScripts.register({
    id: "task-shortcuts",
    mount({ pluginId, signal }) {
      const createKeyboardEvent = (type: string, init: KeyboardEventInit) =>
        new KeyboardEvent(type, init);
      const newThreadCommand = createNativeCommandDelegate({
        command: "thread.new",
        createEvent: createKeyboardEvent,
        async fetchConfig() {
          const response = await fetch("/api/v1/system/config", {
            credentials: "same-origin",
          });
          if (!response.ok) {
            throw new Error(`System config request failed (${response.status})`);
          }
          return response.json() as Promise<unknown>;
        },
        isMac: /Mac|iPhone|iPad|iPod/u.test(navigator.platform),
        target: window,
      });
      void newThreadCommand.prefetch();
      window.addEventListener(
        "keydown",
        (event) => {
          if (newThreadCommand.isDelegatedEvent(event)) return;
          const taskStatus = taskStatusShortcut(event);
          const reorder = taskReorderShortcut(event);
          if (taskStatus === null && reorder === null) return;
          const threadId = currentThreadId(window.location.pathname);
          if (threadId === null) return;

          // Claim the chord everywhere, including editors and composers.
          event.preventDefault();
          event.stopPropagation();
          notifyNativeShortcutHandled(window, createKeyboardEvent);
          const request =
            reorder === null
              ? callTaskRpc(pluginId, "setTaskStatus", {
                  taskStatus,
                  threadId,
                }).then((result) => {
                  goTo(
                    (result as { destination: ChordDestination }).destination,
                    () => void newThreadCommand.dispatch(),
                  );
                })
              : callTaskRpc(pluginId, "reorderTask", {
                  threadId,
                  scope: reorder.scope,
                  direction: reorder.direction,
                });
          void request.catch((error: unknown) => {
            toast.error(rpcErrorMessage(error, "Failed to move the task"));
          });
        },
        { capture: true, signal },
      );
    },
  });
});
