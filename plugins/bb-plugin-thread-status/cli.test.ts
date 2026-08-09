import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runTaskCli } from "./cli";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
  type ThreadStatusStore,
} from "./store";

describe("task CLI", () => {
  let db: Database.Database;
  let store: ThreadStatusStore;

  beforeEach(() => {
    db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    store = createThreadStatusStore(db);
  });

  afterEach(() => db.close());

  it("uses the native entity command shape in top-level help", () => {
    const result = runTaskCli(store, ["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("bb task [options] [command]");
    expect(result.stdout).toContain("list [options]");
    expect(result.stdout).toContain("show [options] [id]");
    expect(result.stdout).toContain("update [options] [id]");
    expect(result.stdout).toContain("reorder [options] <id>");
  });

  it("shows the effective default as human and JSON output", () => {
    expect(runTaskCli(store, ["show", "thr_a"])).toEqual({
      exitCode: 0,
      stdout: "Task: thr_a\n  Status: To Do (default)\n  Order: -\n",
    });
    const result = runTaskCli(store, ["show", "thr_a", "--json"]);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      id: "thr_a",
      status: "To Do",
      sortKey: null,
      explicit: false,
    });
  });

  it("targets the current thread with --self", () => {
    const result = runTaskCli(store, ["show", "--self", "--json"], {
      threadId: "thr_self",
    });
    expect(JSON.parse(result.stdout ?? "").id).toBe("thr_self");
    expect(runTaskCli(store, ["show", "thr_a", "--self"])).toMatchObject({
      exitCode: 1,
      stderr: expect.stringContaining("Cannot combine"),
    });
  });

  it("updates status through a native-style mutation flag", () => {
    const result = runTaskCli(store, [
      "update",
      "thr_a",
      "--status",
      "to-do",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task thr_a updated");
    expect(store.get("thr_a")).toMatchObject({ status: "To Do", explicit: true });
  });

  it("updates the current thread through --self", () => {
    const result = runTaskCli(
      store,
      ["update", "--self", "--status", "Working", "--json"],
      { threadId: "thr_self" },
    );
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      id: "thr_self",
      status: "Working",
    });
  });

  it("lists a JSON array and filters by status", () => {
    store.setStatus("thr_a", "Working");
    store.setStatus("thr_b", "Done");

    const result = runTaskCli(store, [
      "list",
      "--status",
      "Working",
      "--json",
    ]);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject([
      { id: "thr_a", status: "Working" },
    ]);
  });

  it("limits lists to thread IDs supplied by the host", () => {
    store.ensureThreads(["thr_visible", "thr_archived"]);
    const result = runTaskCli(store, ["list", "--json"], {
      listTaskIds: ["thr_visible"],
    });
    expect(JSON.parse(result.stdout ?? "").map((task: { id: string }) => task.id)).toEqual([
      "thr_visible",
    ]);
  });

  it("reorders using the standard adjacent-neighbor interface", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);

    const result = runTaskCli(store, [
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
      JSON.parse(result.stdout ?? "").map(
        (assignment: { id: string }) => assignment.id,
      ),
    ).toEqual(["thr_a", "thr_c", "thr_b"]);
  });

  it("requires explicit state and valid flags when reordering", () => {
    expect(runTaskCli(store, ["reorder", "thr_a"]).stderr).toContain(
      "no explicit status",
    );
    expect(
      runTaskCli(store, ["reorder", "thr_a", "--middle", "thr_b"]),
    ).toMatchObject({ exitCode: 1, stderr: expect.stringContaining("Unknown option") });
  });

  it("prints command-specific help", () => {
    const result = runTaskCli(store, ["help", "reorder"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Usage: bb task reorder <id> [--after <id>] [--before <id>] [--json]",
    );
  });

  it("returns actionable errors for missing changes and invalid statuses", () => {
    expect(runTaskCli(store, ["update", "thr_a"]).stderr).toContain(
      "Provide --status",
    );
    const invalid = runTaskCli(store, [
      "update",
      "thr_a",
      "--status",
      "blocked",
    ]);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain("Done, To Do, Working");
  });
});
