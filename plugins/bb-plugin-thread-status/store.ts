import type BetterSqlite3 from "better-sqlite3";
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
];

interface AssignmentRow {
  thread_id: string;
  status: string;
  position: number;
  updated_at: number;
}
export interface ThreadStatusState {
  revision: number;
  assignments: ThreadAssignment[];
}

export interface ThreadStatusLookup {
  threadId: string;
  status: ThreadStatus;
  position: number | null;
  updatedAt: number | null;
  explicit: boolean;
}

export interface ThreadStatusStore {
  listState(): ThreadStatusState;
  get(threadId: string): ThreadStatusLookup;
  setStatus(threadId: string, status: ThreadStatus): ThreadStatusState;
  moveThread(input: {
    threadId: string;
    status: ThreadStatus;
    orderedThreadIds: readonly string[];
    expectedRevision: number;
  }): ThreadStatusState;
  delete(threadId: string): boolean;
}

function assignmentFromRow(row: AssignmentRow): ThreadAssignment {
  return {
    threadId: row.thread_id,
    status: row.status as ThreadStatus,
    position: row.position,
    updatedAt: row.updated_at,
  };
}

function assertThreadId(threadId: string): void {
  if (threadId.trim().length === 0 || threadId.length > 256) {
    throw new Error("Thread id must contain 1 to 256 characters.");
  }
}

export function createThreadStatusStore(db: Database): ThreadStatusStore {
  const readRevision = db.prepare(
    "SELECT revision FROM thread_organization_meta WHERE singleton = 1",
  );
  const listAssignments = db.prepare(`
    SELECT thread_id, status, position, updated_at
    FROM thread_organization
    ORDER BY status, position, thread_id
  `);
  const getAssignment = db.prepare(`
    SELECT thread_id, status, position, updated_at
    FROM thread_organization
    WHERE thread_id = ?
  `);
  const maxPosition = db.prepare(`
    SELECT COALESCE(MAX(position), 0) AS position
    FROM thread_organization
    WHERE status = ?
  `);
  const upsertAssignment = db.prepare(`
    INSERT INTO thread_organization(thread_id, status, position, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(thread_id) DO UPDATE SET
      status = excluded.status,
      position = excluded.position,
      updated_at = excluded.updated_at
  `);
  const bumpRevision = db.prepare(`
    UPDATE thread_organization_meta
    SET revision = revision + 1
    WHERE singleton = 1
  `);
  const deleteAssignment = db.prepare(
    "DELETE FROM thread_organization WHERE thread_id = ?",
  );

  function revision(): number {
    return (readRevision.get() as { revision: number }).revision;
  }

  function listState(): ThreadStatusState {
    return {
      revision: revision(),
      assignments: (listAssignments.all() as AssignmentRow[]).map(
        assignmentFromRow,
      ),
    };
  }

  const setStatusTransaction = db.transaction(
    (threadId: string, status: ThreadStatus): ThreadStatusState => {
      const row = maxPosition.get(status) as { position: number };
      upsertAssignment.run(threadId, status, row.position + 1024, Date.now());
      bumpRevision.run();
      return listState();
    },
  );

  const moveThreadTransaction = db.transaction(
    (input: {
      threadId: string;
      status: ThreadStatus;
      orderedThreadIds: readonly string[];
      expectedRevision: number;
    }): ThreadStatusState => {
      if (revision() !== input.expectedRevision) {
        throw new Error("Thread organization changed; refresh and try again.");
      }
      if (input.orderedThreadIds.length === 0) {
        throw new Error("The destination order cannot be empty.");
      }
      if (input.orderedThreadIds.length > 10_000) {
        throw new Error("The destination order is too large.");
      }
      const uniqueIds = new Set(input.orderedThreadIds);
      if (uniqueIds.size !== input.orderedThreadIds.length) {
        throw new Error("The destination order contains duplicate thread ids.");
      }
      if (!uniqueIds.has(input.threadId)) {
        throw new Error("The destination order must contain the moved thread.");
      }
      for (const threadId of input.orderedThreadIds) assertThreadId(threadId);

      const now = Date.now();
      input.orderedThreadIds.forEach((threadId, index) => {
        upsertAssignment.run(threadId, input.status, (index + 1) * 1024, now);
      });
      bumpRevision.run();
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
          status: DEFAULT_THREAD_STATUS,
          position: null,
          updatedAt: null,
          explicit: false,
        };
      }
      const assignment = assignmentFromRow(row);
      return { ...assignment, explicit: true };
    },
    setStatus(threadId, status) {
      assertThreadId(threadId);
      if (!THREAD_STATUSES.includes(status)) throw new Error("Unknown status.");
      return setStatusTransaction(threadId, status);
    },
    moveThread(input) {
      assertThreadId(input.threadId);
      if (!THREAD_STATUSES.includes(input.status)) throw new Error("Unknown status.");
      return moveThreadTransaction(input);
    },
    delete(threadId) {
      assertThreadId(threadId);
      return db.transaction(() => {
        const changed = deleteAssignment.run(threadId).changes > 0;
        if (changed) bumpRevision.run();
        return changed;
      })();
    },
  };
}
