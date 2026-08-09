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
];

interface AssignmentRow {
  thread_id: string;
  status: string;
  sort_key: string;
  updated_at: number;
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
}

export interface ThreadStatusStore {
  listState(): ThreadStatusState;
  get(threadId: string): ThreadStatusLookup;
  ensureThreads(threadIds: readonly string[]): ThreadStatusState;
  setStatus(threadId: string, status: ThreadStatus): ThreadStatusState;
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
        WHEN 'To Do' THEN 1
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
    INSERT INTO thread_organization(thread_id, status, position, updated_at, sort_key)
    VALUES (?, ?, 0, ?, ?)
    ON CONFLICT(thread_id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at,
      sort_key = excluded.sort_key
  `);
  const deleteAssignment = db.prepare(
    "DELETE FROM thread_organization WHERE thread_id = ?",
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
        );
        previousKey = sortKey;
      }
      return listState();
    },
  );

  const setStatusTransaction = db.transaction(
    (threadId: string, status: ThreadStatus): ThreadStatusState => {
      const existing = getAssignment.get(threadId) as AssignmentRow | undefined;
      if (existing?.status === status) return listState();
      const last = lastAssignment.get(status) as AssignmentRow | undefined;
      const sortKey = last
        ? createOrderKeyAfter({ previousKey: last.sort_key })
        : createOrderKeyBetween({ previousKey: null, nextKey: null });
      upsertAssignment.run(threadId, status, Date.now(), sortKey);
      return listState();
    },
  );

  const reorderThreadTransaction = db.transaction(
    (input: ReorderThreadInput): ThreadStatusState => {
      const current = listStatusAssignments
        .all(input.taskStatus)
        .map((row) => assignmentFromRow(row as AssignmentRow));
      const moved = getAssignment.get(input.threadId) as AssignmentRow | undefined;
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
      );
      return listState();
    },
  );

  return {
    listState,
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
    setStatus(threadId, status) {
      assertThreadId(threadId);
      if (!THREAD_STATUSES.includes(status)) {
        throw new Error("Unknown task status.");
      }
      return setStatusTransaction.immediate(threadId, status);
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
      return db.transaction(() => deleteAssignment.run(threadId).changes > 0).immediate();
    },
  };
}
