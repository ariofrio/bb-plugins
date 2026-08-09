import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runThreadStatusCli } from "./cli";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
  type ThreadStatusStore,
} from "./store";

describe("thread-status CLI", () => {
  let db: Database.Database;
  let store: ThreadStatusStore;

  beforeEach(() => {
    db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    store = createThreadStatusStore(db);
  });

  afterEach(() => db.close());

  it("gets the effective default as human and JSON output", () => {
    expect(runThreadStatusCli(store, ["get", "thr_a"])).toEqual({
      exitCode: 0,
      stdout: "thr_a\tTo Do (default)\n",
    });
    const result = runThreadStatusCli(store, ["get", "thr_a", "--json"]);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      threadId: "thr_a",
      status: "To Do",
      sortKey: null,
      explicit: false,
    });
  });

  it("sets a case-insensitive, unquoted multiword status", () => {
    const result = runThreadStatusCli(store, ["set", "thr_a", "to", "do"]);

    expect(result).toEqual({ exitCode: 0, stdout: "thr_a\tTo Do\n" });
    expect(store.get("thr_a")).toMatchObject({ status: "To Do", explicit: true });
  });

  it("lists and filters explicit assignments", () => {
    runThreadStatusCli(store, ["set", "thr_a", "working"]);
    runThreadStatusCli(store, ["set", "thr_b", "done"]);

    const result = runThreadStatusCli(store, [
      "list",
      "--status",
      "Working",
      "--json",
    ]);
    expect(JSON.parse(result.stdout ?? "").assignments).toMatchObject([
      { threadId: "thr_a", status: "Working" },
    ]);
  });

  it("reorders using the same adjacent-neighbor interface as pinned threads", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);

    const result = runThreadStatusCli(store, [
      "reorder",
      "thr_c",
      "--after",
      "thr_a",
      "--before",
      "thr_b",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      JSON.parse(result.stdout ?? "").assignments.map(
        (assignment: { threadId: string }) => assignment.threadId,
      ),
    ).toEqual(["thr_a", "thr_c", "thr_b"]);
  });

  it("requires explicit state and valid flags when reordering", () => {
    expect(runThreadStatusCli(store, ["reorder", "thr_a"]).stderr).toContain(
      "no explicit status",
    );
    expect(
      runThreadStatusCli(store, ["reorder", "thr_a", "--middle", "thr_b"]),
    ).toMatchObject({ exitCode: 2 });
  });

  it("prints reorder-specific help", () => {
    expect(runThreadStatusCli(store, ["reorder", "--help"])).toEqual({
      exitCode: 0,
      stdout:
        "Usage: bb thread-status reorder <thread-id> [--after <id>] [--before <id>] [--json]\n",
    });
  });

  it("returns actionable usage for invalid statuses", () => {
    const result = runThreadStatusCli(store, ["set", "thr_a", "blocked"]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Statuses: Done, To Do, Working");
  });
});
