import type BetterSqlite3 from "better-sqlite3";
import { createOrderKeyAfter, createOrderKeyBetween } from "./order-keys";
import {
  DEFAULT_THREAD_STATUS,
  THREAD_STATUSES,
  type ThreadAssignment,
  type ThreadStatus,
} from "./thread-status";

type Database = BetterSqlite3.Database;

export const THREAD_STATUS_MIGRATIONS = [
  `
    CREATE TABLE IF NOT EXISTS thread_organization (
      thread_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('Done', 'To Do', 'Working', 'Waiting', 'Deferred', 'Canceled')),
      position INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS thread_organization_status_position
      ON thread_organization(status, position, thread_id);
    CREATE TABLE IF NOT EXISTS thread_organization_meta (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      revision INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO thread_organization_meta(singleton, revision) VALUES (1, 0);
  `,
  `
    ALTER TABLE thread_organization ADD COLUMN sort_key TEXT;
    UPDATE thread_organization
      SET sort_key = printf('%016d', position)
      WHERE sort_key IS NULL;
    CREATE INDEX IF NOT EXISTS thread_organization_status_sort_key
      ON thread_organization(status, sort_key, thread_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS thread_task_workflow (
      thread_id TEXT PRIMARY KEY,
      is_working INTEGER NOT NULL CHECK (is_working IN (0, 1)),
      updated_at INTEGER NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS thread_task_preview (
      thread_id TEXT PRIMARY KEY,
      preview TEXT,
      updated_at INTEGER NOT NULL
    );
  `,
  `
    CREATE TABLE thread_organization_renamed (
      thread_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('Done', 'To do', 'Working', 'Waiting', 'Deferred', 'Canceled')),
      position INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      sort_key TEXT
    );
    INSERT INTO thread_organization_renamed(thread_id, status, position, updated_at, sort_key)
      SELECT thread_id,
        CASE status WHEN 'To Do' THEN 'To do' ELSE status END,
        position,
        updated_at,
        sort_key
      FROM thread_organization;
    DROP TABLE thread_organization;
    ALTER TABLE thread_organization_renamed RENAME TO thread_organization;
    CREATE INDEX IF NOT EXISTS thread_organization_status_position
      ON thread_organization(status, position, thread_id);
    CREATE INDEX IF NOT EXISTS thread_organization_status_sort_key
      ON thread_organization(status, sort_key, thread_id);
  `,
  `
    ALTER TABLE thread_organization ADD COLUMN moved_by TEXT;
    ALTER TABLE thread_organization ADD COLUMN previous_status TEXT;
    ALTER TABLE thread_organization ADD COLUMN previous_sort_key TEXT;
  `,
];

interface AssignmentRow {
  thread_id: string;
  status: string;
  sort_key: string;
  updated_at: number;
}

/** Where a status change came from. Only `app` moves are undoable. */
export type MoveSource = "app" | "cli" | "auto";

/** Statuses a task only reaches by being filed, never by the workflow. */
const FILED_STATUSES: readonly ThreadStatus[] = [
  "Done",
  "Waiting",
  "Deferred",
  "Canceled",
];

export interface UndoCandidate {
  threadId: string;
  previousStatus: ThreadStatus | null;
  previousSortKey: string | null;
  updatedAt: number;
}

export interface ThreadStatusState {
  assignments: ThreadAssignment[];
}

export interface ThreadStatusLookup {
  threadId: string;
  taskStatus: ThreadStatus;
  sortKey: string | null;
  updatedAt: number | null;
  explicit: boolean;
}

export interface ReorderThreadInput {
  threadId: string;
  taskStatus: ThreadStatus;
  previousThreadId: string | null;
  nextThreadId: string | null;
  source?: MoveSource;
}

export interface WorkingStateObservation {
  state: ThreadStatusState;
  taskStatusChanged: boolean;
}

export interface ThreadPreview {
  threadId: string;
  preview: string | null;
}

export interface ThreadStatusStore {
  listState(): ThreadStatusState;
  listPreviews(): ThreadPreview[];
  listUndoCandidates(): UndoCandidate[];
  get(threadId: string): ThreadStatusLookup;
  ensureThreads(threadIds: readonly string[]): ThreadStatusState;
  setStatus(
    threadId: string,
    status: ThreadStatus,
    source?: MoveSource,
  ): ThreadStatusState;
  restoreToTodo(threadId: string, sortKey: string | null): ThreadStatusState;
  observeWorkingState(
    threadId: string,
    isWorking: boolean,
  ): WorkingStateObservation;
  setPreview(threadId: string, preview: string | null): boolean;
  reorderThread(input: ReorderThreadInput): ThreadStatusState;
  delete(threadId: string): boolean;
}

function assignmentFromRow(row: AssignmentRow): ThreadAssignment {
  return {
    threadId: row.thread_id,
    taskStatus: row.status as ThreadStatus,
    sortKey: row.sort_key,
    updatedAt: row.updated_at,
  };
}

function assertThreadId(threadId: string): void {
  if (threadId.trim().length === 0 || threadId.length > 256) {
    throw new Error("Thread id must contain 1 to 256 characters.");
  }
}

export function createThreadStatusStore(db: Database): ThreadStatusStore {
  const listAssignments = db.prepare(`
    SELECT thread_id, status, sort_key, updated_at
    FROM thread_organization
    WHERE sort_key IS NOT NULL
    ORDER BY
      CASE status
        WHEN 'Done' THEN 0
        WHEN 'To do' THEN 1
        WHEN 'Working' THEN 2
        WHEN 'Waiting' THEN 3
        WHEN 'Deferred' THEN 4
        WHEN 'Canceled' THEN 5
      END,
      sort_key,
      thread_id
  `);
  const listStatusAssignments = db.prepare(`
    SELECT thread_id, status, sort_key, updated_at
    FROM thread_organization
    WHERE status = ? AND sort_key IS NOT NULL
    ORDER BY sort_key, thread_id
  `);
  const getAssignment = db.prepare(`
    SELECT thread_id, status, sort_key, updated_at
    FROM thread_organization
    WHERE thread_id = ? AND sort_key IS NOT NULL
  `);
  const lastAssignment = db.prepare(`
    SELECT thread_id, status, sort_key, updated_at
    FROM thread_organization
    WHERE status = ? AND sort_key IS NOT NULL
    ORDER BY sort_key DESC, thread_id DESC
    LIMIT 1
  `);
  const upsertAssignment = db.prepare(`
    INSERT INTO thread_organization(
      thread_id, status, position, updated_at, sort_key,
      moved_by, previous_status, previous_sort_key
    )
    VALUES (?, ?, 0, ?, ?, ?, ?, ?)
    ON CONFLICT(thread_id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at,
      sort_key = excluded.sort_key,
      moved_by = excluded.moved_by,
      previous_status = excluded.previous_status,
      previous_sort_key = excluded.previous_sort_key
  `);
  const listUndoCandidateRows = db.prepare(`
    SELECT thread_id, previous_status, previous_sort_key, updated_at
    FROM thread_organization
    WHERE moved_by = 'app'
      AND sort_key IS NOT NULL
      AND status IN (${FILED_STATUSES.map(() => "?").join(", ")})
    ORDER BY updated_at DESC, thread_id
  `);
  const deleteAssignment = db.prepare(
    "DELETE FROM thread_organization WHERE thread_id = ?",
  );
  const getWorkingState = db.prepare(
    "SELECT is_working FROM thread_task_workflow WHERE thread_id = ?",
  );
  const upsertWorkingState = db.prepare(`
    INSERT INTO thread_task_workflow(thread_id, is_working, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(thread_id) DO UPDATE SET
      is_working = excluded.is_working,
      updated_at = excluded.updated_at
  `);
  const deleteWorkingState = db.prepare(
    "DELETE FROM thread_task_workflow WHERE thread_id = ?",
  );
  const listPreviewRows = db.prepare(`
    SELECT thread_id, preview
    FROM thread_task_preview
    ORDER BY thread_id
  `);
  const getPreview = db.prepare(
    "SELECT preview FROM thread_task_preview WHERE thread_id = ?",
  );
  const upsertPreview = db.prepare(`
    INSERT INTO thread_task_preview(thread_id, preview, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(thread_id) DO UPDATE SET
      preview = excluded.preview,
      updated_at = excluded.updated_at
  `);
  const deletePreview = db.prepare(
    "DELETE FROM thread_task_preview WHERE thread_id = ?",
  );

  function listState(): ThreadStatusState {
    return {
      assignments: (listAssignments.all() as AssignmentRow[]).map(
        assignmentFromRow,
      ),
    };
  }

  const ensureThreadsTransaction = db.transaction(
    (threadIds: readonly string[]): ThreadStatusState => {
      if (threadIds.length > 10_000) throw new Error("Too many thread ids.");
      const uniqueIds = new Set(threadIds);
      if (uniqueIds.size !== threadIds.length) {
        throw new Error("Thread ids must be unique.");
      }
      for (const threadId of threadIds) assertThreadId(threadId);

      const last = lastAssignment.get(DEFAULT_THREAD_STATUS) as
        | AssignmentRow
        | undefined;
      let previousKey = last?.sort_key ?? null;
      const now = Date.now();
      for (const threadId of threadIds) {
        if (getAssignment.get(threadId)) continue;
        const sortKey =
          previousKey === null
            ? createOrderKeyBetween({ previousKey: null, nextKey: null })
            : createOrderKeyAfter({ previousKey });
        upsertAssignment.run(
          threadId,
          DEFAULT_THREAD_STATUS,
          now,
          sortKey,
          "auto",
          null,
          null,
        );
        previousKey = sortKey;
      }
      return listState();
    },
  );

  function moveToStatus(
    threadId: string,
    status: ThreadStatus,
    source: MoveSource,
  ): boolean {
    const existing = getAssignment.get(threadId) as AssignmentRow | undefined;
    if (existing?.status === status) return false;
    const last = lastAssignment.get(status) as AssignmentRow | undefined;
    const sortKey = last
      ? createOrderKeyAfter({ previousKey: last.sort_key })
      : createOrderKeyBetween({ previousKey: null, nextKey: null });
    upsertAssignment.run(
      threadId,
      status,
      Date.now(),
      sortKey,
      source,
      existing?.status ?? null,
      existing?.sort_key ?? null,
    );
    return true;
  }

  const setStatusTransaction = db.transaction(
    (
      threadId: string,
      status: ThreadStatus,
      source: MoveSource,
    ): ThreadStatusState => {
      moveToStatus(threadId, status, source);
      return listState();
    },
  );

  const restoreToTodoTransaction = db.transaction(
    (threadId: string, sortKey: string | null): ThreadStatusState => {
      if (sortKey === null) {
        moveToStatus(threadId, "To do", "app");
        return listState();
      }
      const existing = getAssignment.get(threadId) as AssignmentRow | undefined;
      upsertAssignment.run(
        threadId,
        "To do",
        Date.now(),
        sortKey,
        "app",
        existing?.status ?? null,
        existing?.sort_key ?? null,
      );
      return listState();
    },
  );

  const observeWorkingStateTransaction = db.transaction(
    (threadId: string, isWorking: boolean): WorkingStateObservation => {
      const previous = getWorkingState.get(threadId) as
        | { is_working: number }
        | undefined;
      let taskStatusChanged = false;

      if (isWorking && previous?.is_working !== 1) {
        taskStatusChanged = moveToStatus(threadId, "Working", "auto");
      } else if (!isWorking && previous?.is_working !== 0) {
        const assignment = getAssignment.get(threadId) as
          | AssignmentRow
          | undefined;
        if (assignment?.status === "Working") {
          taskStatusChanged = moveToStatus(threadId, "To do", "auto");
        }
      }

      upsertWorkingState.run(threadId, isWorking ? 1 : 0, Date.now());
      return { state: listState(), taskStatusChanged };
    },
  );

  const reorderThreadTransaction = db.transaction(
    (input: ReorderThreadInput): ThreadStatusState => {
      const moved = getAssignment.get(input.threadId) as AssignmentRow | undefined;
      if (
        moved?.status === input.taskStatus &&
        input.previousThreadId === null &&
        input.nextThreadId === null
      ) {
        return listState();
      }
      const current = listStatusAssignments
        .all(input.taskStatus)
        .map((row) => assignmentFromRow(row as AssignmentRow));
      if (
        input.previousThreadId === input.threadId ||
        input.nextThreadId === input.threadId
      ) {
        throw new Error("The moved thread cannot be its own neighbor.");
      }

      const previous =
        input.previousThreadId === null
          ? null
          : current.find((item) => item.threadId === input.previousThreadId);
      const next =
        input.nextThreadId === null
          ? null
          : current.find((item) => item.threadId === input.nextThreadId);
      if (
        (input.previousThreadId !== null && !previous) ||
        (input.nextThreadId !== null && !next)
      ) {
        throw new Error("Thread order changed; refresh and try again.");
      }
      if (previous && next && previous.sortKey >= next.sortKey) {
        throw new Error("The previous thread must sort before the next thread.");
      }

      const currentIndex = current.findIndex(
        (item) => item.threadId === input.threadId,
      );
      if (
        moved?.status === input.taskStatus &&
        (current[currentIndex - 1]?.threadId ?? null) === input.previousThreadId &&
        (current[currentIndex + 1]?.threadId ?? null) === input.nextThreadId
      ) {
        return listState();
      }

      const sortKey = createOrderKeyBetween({
        previousKey: previous?.sortKey ?? null,
        nextKey: next?.sortKey ?? null,
      });
      upsertAssignment.run(
        input.threadId,
        input.taskStatus,
        Date.now(),
        sortKey,
        input.source ?? "app",
        moved?.status ?? null,
        moved?.sort_key ?? null,
      );
      return listState();
    },
  );

  return {
    listState,
    listPreviews() {
      return (
        listPreviewRows.all() as Array<{
          thread_id: string;
          preview: string | null;
        }>
      ).map((row) => ({ threadId: row.thread_id, preview: row.preview }));
    },
    get(threadId) {
      assertThreadId(threadId);
      const row = getAssignment.get(threadId) as AssignmentRow | undefined;
      if (!row) {
        return {
          threadId,
          taskStatus: DEFAULT_THREAD_STATUS,
          sortKey: null,
          updatedAt: null,
          explicit: false,
        };
      }
      const assignment = assignmentFromRow(row);
      return { ...assignment, explicit: true };
    },
    ensureThreads(threadIds) {
      return ensureThreadsTransaction.immediate(threadIds);
    },
    setStatus(threadId, status, source = "app") {
      assertThreadId(threadId);
      if (!THREAD_STATUSES.includes(status)) {
        throw new Error("Unknown task status.");
      }
      return setStatusTransaction.immediate(threadId, status, source);
    },
    restoreToTodo(threadId, sortKey) {
      assertThreadId(threadId);
      return restoreToTodoTransaction.immediate(threadId, sortKey);
    },
    listUndoCandidates() {
      return (
        listUndoCandidateRows.all(...FILED_STATUSES) as Array<{
          thread_id: string;
          previous_status: string | null;
          previous_sort_key: string | null;
          updated_at: number;
        }>
      ).map((row) => ({
        threadId: row.thread_id,
        previousStatus: (row.previous_status as ThreadStatus | null) ?? null,
        previousSortKey: row.previous_sort_key,
        updatedAt: row.updated_at,
      }));
    },
    observeWorkingState(threadId, isWorking) {
      assertThreadId(threadId);
      return observeWorkingStateTransaction.immediate(threadId, isWorking);
    },
    setPreview(threadId, preview) {
      assertThreadId(threadId);
      if (preview !== null && preview.length > 500) {
        throw new Error("Thread preview must contain at most 500 characters.");
      }
      const existing = getPreview.get(threadId) as
        | { preview: string | null }
        | undefined;
      if (existing && existing.preview === preview) return false;
      upsertPreview.run(threadId, preview, Date.now());
      return true;
    },
    reorderThread(input) {
      assertThreadId(input.threadId);
      if (input.previousThreadId) assertThreadId(input.previousThreadId);
      if (input.nextThreadId) assertThreadId(input.nextThreadId);
      if (!THREAD_STATUSES.includes(input.taskStatus)) {
        throw new Error("Unknown task status.");
      }
      return reorderThreadTransaction.immediate(input);
    },
    delete(threadId) {
      assertThreadId(threadId);
      return db
        .transaction(() => {
          const assignmentDeleted = deleteAssignment.run(threadId).changes > 0;
          const workflowDeleted = deleteWorkingState.run(threadId).changes > 0;
          const previewDeleted = deletePreview.run(threadId).changes > 0;
          return assignmentDeleted || workflowDeleted || previewDeleted;
        })
        .immediate();
    },
  };
}
