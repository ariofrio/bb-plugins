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
      stdout: "Task: thr_a\n  Task Status: To do (default)\n  Order: -\n",
    });
    const result = runTaskCli(store, ["show", "thr_a", "--json"]);
    const task = JSON.parse(result.stdout ?? "");
    expect(task).toMatchObject({
      id: "thr_a",
      taskStatus: "To do",
      sortKey: null,
      explicit: false,
    });
    expect(task).not.toHaveProperty("status");
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
      "Working",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task thr_a updated");
    expect(store.get("thr_a")).toMatchObject({
      taskStatus: "Working",
      explicit: true,
    });
  });

  it("updates the current thread through --self", () => {
    const result = runTaskCli(
      store,
      ["update", "--self", "--status", "Working", "--json"],
      { threadId: "thr_self" },
    );
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      id: "thr_self",
      taskStatus: "Working",
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
    const tasks = JSON.parse(result.stdout ?? "");
    expect(tasks).toMatchObject([
      { id: "thr_a", taskStatus: "Working" },
    ]);
    expect(tasks[0]).not.toHaveProperty("status");
    expect(tasks[0]).not.toHaveProperty("sortKey");
  });

  it("lists tasks without order keys in canonical display order", () => {
    store.ensureThreads(["thr_todo"]);
    store.setStatus("thr_backlog", "Backlog");
    store.setStatus("thr_waiting", "Waiting");
    store.setStatus("thr_done", "Done");
    store.setStatus("thr_working", "Working");
    store.setStatus("thr_canceled", "Canceled");

    const result = runTaskCli(store, ["list"]);
    const stdout = result.stdout ?? "";
    const doneKey = store.get("thr_done").sortKey ?? "";

    expect(result.exitCode).toBe(0);
    expect(stdout).not.toContain("Order");
    expect(doneKey).not.toBe("");
    expect(stdout).not.toContain(doneKey);
    expect(stdout.indexOf("thr_backlog")).toBeLessThan(
      stdout.indexOf("thr_todo"),
    );
    expect(stdout.indexOf("thr_todo")).toBeLessThan(
      stdout.indexOf("thr_working"),
    );
    expect(stdout.indexOf("thr_working")).toBeLessThan(
      stdout.indexOf("thr_waiting"),
    );
    expect(stdout.indexOf("thr_waiting")).toBeLessThan(
      stdout.indexOf("thr_done"),
    );
    expect(stdout.indexOf("thr_done")).toBeLessThan(
      stdout.indexOf("thr_canceled"),
    );
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
      taskStatus: "To do",
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
        .assignments.filter((assignment) => assignment.taskStatus === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_second", "thr_moved"]);
  });

  it("preserves position when updating to the current status without position flags", () => {
    store.ensureThreads(["thr_first", "thr_middle", "thr_last"]);
    const before = store.get("thr_middle");

    const result = runTaskCli(store, [
      "update",
      "thr_middle",
      "--status",
      "To do",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      store.listState().assignments.map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_middle", "thr_last"]);
    expect(store.get("thr_middle")).toEqual(before);
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
        .assignments.filter((assignment) => assignment.taskStatus === "Working")
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
      "Warning: --after task thr_done is not in task status Working; ignoring --after.\n",
    );
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.taskStatus === "Working")
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
    expect(store.get("thr_moved").taskStatus).toBe("Working");
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
    expect(invalid.stderr).toContain("Backlog, To do, Working");
  });
});
