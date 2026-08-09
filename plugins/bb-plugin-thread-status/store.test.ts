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
      status: "To Do",
      position: null,
      updatedAt: null,
      explicit: false,
    });
  });

  it("sets statuses and appends within the destination group", () => {
    store.setStatus("thr_a", "Working");
    store.setStatus("thr_b", "Working");

    expect(store.listState().assignments).toMatchObject([
      { threadId: "thr_a", status: "Working", position: 1024 },
      { threadId: "thr_b", status: "Working", position: 2048 },
    ]);
    expect(store.listState().revision).toBe(2);
  });

  it("materializes an exact destination order and changes status atomically", () => {
    store.setStatus("thr_a", "To Do");
    store.setStatus("thr_b", "Working");
    const before = store.listState();

    const after = store.moveThread({
      threadId: "thr_a",
      status: "Working",
      orderedThreadIds: ["thr_b", "thr_a", "thr_unassigned"],
      expectedRevision: before.revision,
    });

    expect(
      after.assignments
        .filter((assignment) => assignment.status === "Working")
        .map(({ threadId, position }) => ({ threadId, position })),
    ).toEqual([
      { threadId: "thr_b", position: 1024 },
      { threadId: "thr_a", position: 2048 },
      { threadId: "thr_unassigned", position: 3072 },
    ]);
    expect(after.revision).toBe(before.revision + 1);
  });

  it("rejects stale and malformed reorder requests without changing state", () => {
    store.setStatus("thr_a", "Working");
    const before = store.listState();

    expect(() =>
      store.moveThread({
        threadId: "thr_a",
        status: "Done",
        orderedThreadIds: ["thr_a"],
        expectedRevision: before.revision - 1,
      }),
    ).toThrow("changed");
    expect(() =>
      store.moveThread({
        threadId: "thr_a",
        status: "Done",
        orderedThreadIds: ["thr_a", "thr_a"],
        expectedRevision: before.revision,
      }),
    ).toThrow("duplicate");
    expect(store.listState()).toEqual(before);
  });

  it("removes organization state for deleted threads", () => {
    store.setStatus("thr_a", "Deferred");
    const revision = store.listState().revision;

    expect(store.delete("thr_a")).toBe(true);
    expect(store.delete("thr_a")).toBe(false);
    expect(store.listState()).toMatchObject({
      revision: revision + 1,
      assignments: [],
    });
  });
});
