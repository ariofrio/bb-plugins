import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
  type ThreadStatusStore,
} from "./store";

describe("thread status store", () => {
  let db: Database.Database;
  let store: ThreadStatusStore;

  beforeEach(() => {
    db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    store = createThreadStatusStore(db);
  });

  afterEach(() => db.close());

  it("returns To Do for a thread with no explicit assignment", () => {
    expect(store.get("thr_new")).toEqual({
      threadId: "thr_new",
      taskStatus: "To Do",
      sortKey: null,
      updatedAt: null,
      explicit: false,
    });
  });

  it("materializes missing threads in their supplied order", () => {
    const first = store.ensureThreads(["thr_a", "thr_b", "thr_c"]);
    const initialKeys = first.assignments.map((assignment) => assignment.sortKey);

    expect(first.assignments.map((assignment) => assignment.threadId)).toEqual([
      "thr_a",
      "thr_b",
      "thr_c",
    ]);
    expect(initialKeys).toEqual([...initialKeys].sort());
    expect(store.ensureThreads(["thr_a", "thr_b", "thr_c"])).toEqual(first);
  });

  it("lists canonical status groups and fractional order within each group", () => {
    store.ensureThreads(["thr_todo_first", "thr_todo_second"]);
    store.setStatus("thr_canceled", "Canceled");
    store.setStatus("thr_waiting", "Waiting");
    store.setStatus("thr_done", "Done");
    store.setStatus("thr_working_first", "Working");
    store.setStatus("thr_working_second", "Working");
    store.setStatus("thr_deferred", "Deferred");

    expect(
      store.listState().assignments.map((assignment) => assignment.threadId),
    ).toEqual([
      "thr_done",
      "thr_todo_first",
      "thr_todo_second",
      "thr_working_first",
      "thr_working_second",
      "thr_waiting",
      "thr_deferred",
      "thr_canceled",
    ]);
  });

  it("places status changes at the bottom and preserves idempotent keys", () => {
    store.ensureThreads(["thr_a", "thr_b"]);
    store.setStatus("thr_b", "Working");
    const firstKey = store.get("thr_b").sortKey;
    store.setStatus("thr_b", "Working");
    expect(store.get("thr_b").sortKey).toBe(firstKey);

    store.setStatus("thr_a", "Working");
    const working = store
      .listState()
      .assignments.filter((assignment) => assignment.taskStatus === "Working");
    expect(working.map((assignment) => assignment.threadId)).toEqual([
      "thr_b",
      "thr_a",
    ]);
    expect(working[0]?.sortKey < (working[1]?.sortKey ?? "")).toBe(true);
  });

  it("moves a task to Working only when it enters a working lifecycle", () => {
    store.ensureThreads(["thr_a"]);

    store.observeWorkingState("thr_a", true);
    expect(store.get("thr_a").taskStatus).toBe("Working");

    store.setStatus("thr_a", "Waiting");
    store.observeWorkingState("thr_a", true);
    expect(store.get("thr_a").taskStatus).toBe("Waiting");
  });

  it("moves a Working task to To Do when work stops without undoing an override", () => {
    store.observeWorkingState("thr_finished", true);
    store.observeWorkingState("thr_finished", false);
    expect(store.get("thr_finished").taskStatus).toBe("To Do");

    store.observeWorkingState("thr_overridden", true);
    store.setStatus("thr_overridden", "Deferred");
    store.observeWorkingState("thr_overridden", false);
    expect(store.get("thr_overridden").taskStatus).toBe("Deferred");
  });

  it("persists the lifecycle edge across store recreation", () => {
    store.observeWorkingState("thr_a", true);
    store.setStatus("thr_a", "Canceled");

    const reloadedStore = createThreadStatusStore(db);
    reloadedStore.observeWorkingState("thr_a", true);

    expect(reloadedStore.get("thr_a").taskStatus).toBe("Canceled");
  });

  it("reconciles a previously unobserved idle Working task to To Do", () => {
    store.setStatus("thr_a", "Working");

    store.observeWorkingState("thr_a", false);

    expect(store.get("thr_a").taskStatus).toBe("To Do");
  });

  it("persists one derived message preview per thread", () => {
    expect(store.setPreview("thr_a", "Latest message")).toBe(true);
    expect(store.setPreview("thr_a", "Latest message")).toBe(false);
    expect(store.setPreview("thr_b", null)).toBe(true);

    expect(store.listPreviews()).toEqual([
      { threadId: "thr_a", preview: "Latest message" },
      { threadId: "thr_b", preview: null },
    ]);
  });

  it("changes only the moved row's key when reordering between neighbors", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);
    const before = new Map(
      store.listState().assignments.map((assignment) => [
        assignment.threadId,
        assignment.sortKey,
      ]),
    );

    const after = store.reorderThread({
      threadId: "thr_c",
      taskStatus: "To Do",
      previousThreadId: "thr_a",
      nextThreadId: "thr_b",
    });

    expect(after.assignments.map((assignment) => assignment.threadId)).toEqual([
      "thr_a",
      "thr_c",
      "thr_b",
    ]);
    expect(store.get("thr_a").sortKey).toBe(before.get("thr_a"));
    expect(store.get("thr_b").sortKey).toBe(before.get("thr_b"));
    expect(store.get("thr_c").sortKey).not.toBe(before.get("thr_c"));
  });

  it("preserves position when reordering within the same status without neighbors", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);
    const before = store.get("thr_b");

    const after = store.reorderThread({
      threadId: "thr_b",
      taskStatus: "To Do",
      previousThreadId: null,
      nextThreadId: null,
    });

    expect(after.assignments.map((assignment) => assignment.threadId)).toEqual([
      "thr_a",
      "thr_b",
      "thr_c",
    ]);
    expect(store.get("thr_b")).toEqual(before);
  });

  it("changes status and order in one transaction", () => {
    store.ensureThreads(["thr_a", "thr_b"]);
    store.setStatus("thr_b", "Working");

    const after = store.reorderThread({
      threadId: "thr_a",
      taskStatus: "Working",
      previousThreadId: "thr_b",
      nextThreadId: null,
    });

    expect(
      after.assignments
        .filter((assignment) => assignment.taskStatus === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_b", "thr_a"]);
  });

  it("materializes an unassigned moved thread during an ordered status change", () => {
    store.ensureThreads(["thr_before", "thr_after"]);
    store.setStatus("thr_before", "Working");
    store.setStatus("thr_after", "Working");

    const after = store.reorderThread({
      threadId: "thr_new",
      taskStatus: "Working",
      previousThreadId: "thr_before",
      nextThreadId: "thr_after",
    });

    expect(
      after.assignments
        .filter((assignment) => assignment.taskStatus === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_before", "thr_new", "thr_after"]);
  });

  it("rejects stale, reversed, and self-referential neighbors", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);
    const before = store.listState();

    expect(() =>
      store.reorderThread({
        threadId: "thr_c",
        taskStatus: "To Do",
        previousThreadId: "thr_missing",
        nextThreadId: null,
      }),
    ).toThrow("changed");
    expect(() =>
      store.reorderThread({
        threadId: "thr_c",
        taskStatus: "To Do",
        previousThreadId: "thr_b",
        nextThreadId: "thr_a",
      }),
    ).toThrow("sort before");
    expect(() =>
      store.reorderThread({
        threadId: "thr_c",
        taskStatus: "To Do",
        previousThreadId: "thr_c",
        nextThreadId: null,
      }),
    ).toThrow("own neighbor");
    expect(store.listState()).toEqual(before);
  });

  it("migrates integer positions to lexicographically equivalent keys", () => {
    const migrationDb = new Database(":memory:");
    try {
      migrationDb.exec(THREAD_STATUS_MIGRATIONS[0] ?? "");
      migrationDb
        .prepare(
          "INSERT INTO thread_organization(thread_id, status, position, updated_at) VALUES (?, ?, ?, ?)",
        )
        .run("thr_b", "Waiting", 2048, 1);
      migrationDb
        .prepare(
          "INSERT INTO thread_organization(thread_id, status, position, updated_at) VALUES (?, ?, ?, ?)",
        )
        .run("thr_a", "Waiting", 1024, 1);
      migrationDb.exec(THREAD_STATUS_MIGRATIONS[1] ?? "");
      for (const migration of THREAD_STATUS_MIGRATIONS.slice(2)) {
        migrationDb.exec(migration);
      }

      const migrated = createThreadStatusStore(migrationDb).listState();
      expect(migrated.assignments).toMatchObject([
        { threadId: "thr_a", sortKey: "0000000000001024" },
        { threadId: "thr_b", sortKey: "0000000000002048" },
      ]);
    } finally {
      migrationDb.close();
    }
  });

  it("removes organization state for deleted threads", () => {
    store.observeWorkingState("thr_a", true);
    store.setStatus("thr_a", "Deferred");

    expect(store.delete("thr_a")).toBe(true);
    expect(store.delete("thr_a")).toBe(false);
    expect(store.listState()).toEqual({ assignments: [] });

    store.observeWorkingState("thr_a", true);
    expect(store.get("thr_a").taskStatus).toBe("Working");
  });
});
