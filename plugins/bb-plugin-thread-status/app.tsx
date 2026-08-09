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
import type { rpcContract } from "./server";
import {
  THREAD_STATUSES,
  destinationOrder,
  groupThreadsByStatus,
  type ThreadAssignment,
  type ThreadStatus,
} from "./thread-status";

interface OrganizationState {
  revision: number;
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
  onDragOverBefore: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDropBefore: (event: DragEvent<HTMLElement>) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onNavigate: () => void;
  projectName: string | null;
  showDropBefore: boolean;
  status: ThreadStatus;
  thread: PluginSidebarThread;
}

function threadTitle(thread: PluginSidebarThread): string {
  return thread.title ?? thread.titleFallback ?? "Untitled thread";
}

function indicatorGlyph(thread: PluginSidebarThread): string | null {
  switch (thread.indicator) {
    case "unread-error":
      return "!";
    case "waiting-for-input":
      return "?";
    case "unread-success":
      return "✓";
    case "workflow":
    case "background-agent":
    case "background-command":
    case "plan-mode":
    case "goal":
    case "runtime":
    case "working-draft":
      return "●";
    case "draft":
      return "•";
    case "none":
    default:
      return null;
  }
}

function threadSubtitle(
  thread: PluginSidebarThread,
  projectName: string | null,
): string {
  const workspace =
    thread.environment?.branchName ?? thread.host?.name ?? thread.providerId;
  return [projectName, workspace].filter(Boolean).join(" · ");
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
  onDragOverBefore,
  onDragStart,
  onDropBefore,
  onMoveDown,
  onMoveUp,
  onNavigate,
  projectName,
  showDropBefore,
  status,
  thread,
}: ThreadRowProps) {
  const { splitProps } = experimental_useSidebarThreadSplit(thread.id);
  const title = threadTitle(thread);
  const subtitle = threadSubtitle(thread, projectName);
  const glyph = indicatorGlyph(thread);

  function openThread(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    actions.open(thread.id, { split: event.metaKey || event.ctrlKey });
    onNavigate();
  }

  return (
    <li
      className={`group relative flex min-w-0 items-center gap-1 border-t-2 px-2 py-1.5 transition-colors ${
        showDropBefore ? "border-primary" : "border-transparent"
      } ${active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"} ${
        dragging ? "opacity-40" : ""
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragOverBefore();
      }}
      onDrop={onDropBefore}
    >
      <span
        aria-label={`Drag ${title}`}
        className="cursor-grab select-none px-0.5 text-muted-foreground active:cursor-grabbing"
        draggable={!disabled}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        role="button"
        tabIndex={0}
        title="Drag to reorder or change status"
      >
        ⋮⋮
      </span>
      <a
        {...splitProps}
        className="min-w-0 flex-1 rounded-sm px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-sidebar-thread-id={thread.id}
        data-sidebar-thread-shortcut-target=""
        href={`#thread-${encodeURIComponent(thread.id)}`}
        onClick={openThread}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {glyph ? (
            <span
              aria-label={thread.indicatorLabel ?? undefined}
              className="w-3 shrink-0 text-center text-[10px] text-primary"
              title={thread.indicatorLabel ?? undefined}
            >
              {glyph}
            </span>
          ) : null}
          <span
            className={`truncate text-sm ${thread.isUnread ? "font-semibold" : "font-medium"}`}
          >
            {title}
          </span>
        </span>
        {subtitle ? (
          <span className="block truncate text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </a>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          aria-label={`Move ${title} up`}
          className="h-6 w-5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          disabled={disabled || !canMoveUp}
          onClick={onMoveUp}
          title="Move up"
          type="button"
        >
          ↑
        </button>
        <button
          aria-label={`Move ${title} down`}
          className="h-6 w-5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          disabled={disabled || !canMoveDown}
          onClick={onMoveDown}
          title="Move down"
          type="button"
        >
          ↓
        </button>
        <select
          aria-label={`Status for ${title}`}
          className="h-6 w-6 cursor-pointer appearance-none rounded bg-transparent text-center text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
          disabled={disabled}
          onChange={(event) => onChangeStatus(event.target.value as ThreadStatus)}
          title={`Status: ${status}`}
          value={status}
        >
          {THREAD_STATUSES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </li>
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
    revision: 0,
    assignments: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingThreadId, setDraggingThreadId] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<ThreadStatus>>(() => new Set());
  const [mutationPending, setMutationPending] = useState(false);
  const wasConnected = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const state = await rpc.call("listState");
      setOrganization(state);
      setError(null);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load thread statuses.");
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
      if (mutationPending) return;
      const order = destinationOrder(
        groups[status].map((thread) => thread.id),
        threadId,
        beforeThreadId,
      );
      const previous = organization;
      const now = Date.now();
      const destinationIds = new Set(order);
      setOrganization({
        revision: previous.revision + 1,
        assignments: [
          ...previous.assignments.filter(
            (assignment) => !destinationIds.has(assignment.threadId),
          ),
          ...order.map((id, index) => ({
            threadId: id,
            status,
            position: (index + 1) * 1024,
            updatedAt: now,
          })),
        ],
      });
      setMutationPending(true);
      setError(null);
      try {
        const state = await rpc.call("moveThread", {
          threadId,
          status,
          orderedThreadIds: order,
          expectedRevision: previous.revision,
        });
        setOrganization(state);
      } catch (cause) {
        setOrganization(previous);
        setError(cause instanceof Error ? cause.message : "Could not move the thread.");
        await refresh();
      } finally {
        setMutationPending(false);
        setDraggingThreadId(null);
        setDropBefore(null);
      }
    },
    [groups, mutationPending, organization, refresh, rpc],
  );

  function toggleCollapsed(status: ThreadStatus): void {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  if (sidebar.status === "loading" || !loaded) {
    return <div className="p-3 text-sm text-muted-foreground">Loading threads…</div>;
  }

  if (sidebar.status === "error") {
    return <div className="p-3 text-sm text-destructive">Could not load threads.</div>;
  }

  return (
    <div className="pb-3" onDragEnd={() => setDraggingThreadId(null)}>
      {error ? (
        <div className="mx-2 my-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </div>
      ) : null}
      {THREAD_STATUSES.map((status) => {
        const allThreads = groups[status];
        const shownThreads = allThreads.filter(matchesSearch);
        const isCollapsed = collapsed.has(status);
        if (normalizedSearch && shownThreads.length === 0) return null;
        return (
          <section
            aria-labelledby={`thread-status-${status.replace(/\s/g, "-")}`}
            className="mb-1"
            key={status}
            onDragOver={(event) => {
              if (!draggingThreadId) return;
              event.preventDefault();
              setDropBefore(null);
            }}
            onDrop={(event) => {
              if (!draggingThreadId) return;
              event.preventDefault();
              void commitMove(draggingThreadId, status, null);
            }}
          >
            <button
              aria-expanded={!isCollapsed}
              className="sticky top-0 z-10 flex w-full items-center gap-2 bg-background/95 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur hover:text-foreground"
              id={`thread-status-${status.replace(/\s/g, "-")}`}
              onClick={() => toggleCollapsed(status)}
              type="button"
            >
              <span aria-hidden="true">{isCollapsed ? "›" : "⌄"}</span>
              <span>{status}</span>
              <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {shownThreads.length}
              </span>
            </button>
            {!isCollapsed ? (
              shownThreads.length > 0 ? (
                <ul>
                  {shownThreads.map((thread) => {
                    const fullIndex = allThreads.findIndex((item) => item.id === thread.id);
                    return (
                      <ThreadRow
                        actions={actions}
                        active={thread.id === activeThreadId}
                        canMoveDown={fullIndex < allThreads.length - 1}
                        canMoveUp={fullIndex > 0}
                        disabled={mutationPending}
                        dragging={thread.id === draggingThreadId}
                        key={thread.id}
                        onChangeStatus={(nextStatus) => {
                          void commitMove(thread.id, nextStatus, null);
                        }}
                        onDragEnd={() => {
                          setDraggingThreadId(null);
                          setDropBefore(null);
                        }}
                        onDragOverBefore={() => setDropBefore(thread.id)}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", thread.id);
                          setDraggingThreadId(thread.id);
                        }}
                        onDropBefore={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!draggingThreadId || draggingThreadId === thread.id) return;
                          void commitMove(draggingThreadId, status, thread.id);
                        }}
                        onMoveDown={() => {
                          const before = allThreads[fullIndex + 2]?.id ?? null;
                          void commitMove(thread.id, status, before);
                        }}
                        onMoveUp={() => {
                          void commitMove(thread.id, status, allThreads[fullIndex - 1]?.id ?? null);
                        }}
                        onNavigate={onNavigate}
                        projectName={projectNames.get(thread.projectId) ?? null}
                        showDropBefore={dropBefore === thread.id}
                        status={status}
                        thread={thread}
                      />
                    );
                  })}
                </ul>
              ) : (
                <div className="mx-2 min-h-9 rounded-md border border-dashed border-border px-2 py-2 text-center text-[11px] text-muted-foreground">
                  Drop a thread here
                </div>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "thread-status",
    title: "Thread Status",
    description: "Manual thread order grouped by workflow status.",
    component: ThreadStatusList,
  });
});
