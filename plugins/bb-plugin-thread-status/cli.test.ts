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
    expect(result.stdout).not.toContain("reorder [options]");
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

  it("moves a task within its status through update", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);

    const result = runTaskCli(store, [
      "update",
      "thr_c",
      "--after",
      "thr_a",
      "--before",
      "thr_b",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      store
        .listState()
        .assignments.map((assignment) => assignment.threadId),
    ).toEqual(["thr_a", "thr_c", "thr_b"]);
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      id: "thr_c",
      status: "To Do",
    });
  });

  it("appends a task when changing its status without position flags", () => {
    store.ensureThreads(["thr_first", "thr_second", "thr_moved"]);
    store.setStatus("thr_first", "Working");
    store.setStatus("thr_second", "Working");

    const result = runTaskCli(store, [
      "update",
      "thr_moved",
      "--status",
      "Working",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.status === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_second", "thr_moved"]);
  });

  it("overrides status-change position through update", () => {
    store.ensureThreads(["thr_first", "thr_second", "thr_moved"]);
    store.setStatus("thr_first", "Working");
    store.setStatus("thr_second", "Working");

    const result = runTaskCli(store, [
      "update",
      "thr_moved",
      "--status",
      "Working",
      "--after",
      "thr_first",
      "--before",
      "thr_second",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.status === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_moved", "thr_second"]);
  });

  it("ignores and warns about neighbors outside the destination status", () => {
    store.ensureThreads(["thr_working", "thr_done", "thr_moved"]);
    store.setStatus("thr_working", "Working");
    store.setStatus("thr_done", "Done");

    const result = runTaskCli(store, [
      "update",
      "thr_moved",
      "--status",
      "Working",
      "--after",
      "thr_done",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe(
      "Warning: --after task thr_done is not in status Working; ignoring --after.\n",
    );
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.status === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_working", "thr_moved"]);
  });

  it("applies a valid neighbor while ignoring an invalid one", () => {
    store.ensureThreads(["thr_first", "thr_second", "thr_done", "thr_moved"]);
    store.setStatus("thr_first", "Working");
    store.setStatus("thr_second", "Working");
    store.setStatus("thr_done", "Done");

    const result = runTaskCli(store, [
      "update",
      "thr_moved",
      "--status",
      "Working",
      "--after",
      "thr_first",
      "--before",
      "thr_done",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("ignoring --before");
    expect(store.get("thr_moved").status).toBe("Working");
    expect(store.get("thr_moved").sortKey! > store.get("thr_first").sortKey!).toBe(
      true,
    );
  });

  it("prints update-specific ordering help", () => {
    const result = runTaskCli(store, ["help", "update"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--after <id>");
    expect(result.stdout).toContain("--before <id>");
  });

  it("does not expose a standalone reorder command", () => {
    const result = runTaskCli(store, ["reorder", "thr_a", "--after", "thr_b"]);
    expect(result).toMatchObject({
      exitCode: 2,
      stderr: expect.stringContaining("Unknown command: reorder"),
    });
  });

  it("returns actionable errors for missing changes and invalid statuses", () => {
    expect(runTaskCli(store, ["update", "thr_a"]).stderr).toContain(
      "Provide --status, --after, or --before",
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
