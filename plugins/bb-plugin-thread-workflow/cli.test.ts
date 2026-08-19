import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runThreadWorkflowCli } from "./cli";
import {
  THREAD_WORKFLOW_MIGRATIONS,
  createThreadWorkflowStore,
  type ThreadWorkflowStore,
} from "./store";

describe("task CLI", () => {
  let db: Database.Database;
  let store: ThreadWorkflowStore;

  beforeEach(() => {
    db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    store = createThreadWorkflowStore(db);
  });

  afterEach(() => db.close());

  it("uses the thread-workflow command and stage vocabulary in top-level help", () => {
    const result = runThreadWorkflowCli(store, ["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("bb thread-workflow [options] [command]");
    expect(result.stdout).toContain("Organize root threads into workflow stages");
    expect(result.stdout).toContain("list [options]");
    expect(result.stdout).toContain("show [options] [id]");
    expect(result.stdout).toContain("update [options] [id]");
    expect(result.stdout).not.toContain("reorder [options]");
  });

  it("shows the effective default stage as human and JSON output", () => {
    expect(runThreadWorkflowCli(store, ["show", "thr_a"])).toEqual({
      exitCode: 0,
      stdout: "Thread: thr_a\n  Workflow stage: To do (default)\n  Order: -\n",
    });
    const result = runThreadWorkflowCli(store, ["show", "thr_a", "--json"]);
    const task = JSON.parse(result.stdout ?? "");
    expect(task).toMatchObject({
      id: "thr_a",
      workflowStage: "To do",
      sortKey: null,
      explicit: false,
    });
    expect(task).not.toHaveProperty("taskStatus");
  });

  it("targets the current thread with --self", () => {
    const result = runThreadWorkflowCli(store, ["show", "--self", "--json"], {
      threadId: "thr_self",
    });
    expect(JSON.parse(result.stdout ?? "").id).toBe("thr_self");
    expect(runThreadWorkflowCli(store, ["show", "thr_a", "--self"])).toMatchObject({
      exitCode: 1,
      stderr: expect.stringContaining("Cannot combine"),
    });
  });

  it("updates the workflow stage through --stage", () => {
    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_a",
      "--stage",
      "Working",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Thread thr_a updated");
    expect(store.get("thr_a")).toMatchObject({
      workflowStage: "Working",
      explicit: true,
    });
  });

  it("updates the current thread through --self", () => {
    const result = runThreadWorkflowCli(
      store,
      ["update", "--self", "--stage", "Working", "--json"],
      { threadId: "thr_self" },
    );
    expect(JSON.parse(result.stdout ?? "")).toMatchObject({
      id: "thr_self",
      workflowStage: "Working",
    });
  });

  it("lists a JSON array and filters by workflow stage", () => {
    store.setStage("thr_a", "Working");
    store.setStage("thr_b", "Done");

    const result = runThreadWorkflowCli(store, [
      "list",
      "--stage",
      "Working",
      "--json",
    ]);
    const tasks = JSON.parse(result.stdout ?? "");
    expect(tasks).toMatchObject([
      { id: "thr_a", workflowStage: "Working" },
    ]);
    expect(tasks[0]).not.toHaveProperty("taskStatus");
    expect(tasks[0]).not.toHaveProperty("sortKey");
  });

  it("lists threads without order keys in canonical stage order", () => {
    store.ensureThreads(["thr_todo"]);
    store.setStage("thr_backlog", "Backlog");
    store.setStage("thr_blocked", "Blocked");
    store.setStage("thr_done", "Done");
    store.setStage("thr_working", "Working");
    store.setStage("thr_canceled", "Canceled");

    const result = runThreadWorkflowCli(store, ["list"]);
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
      stdout.indexOf("thr_blocked"),
    );
    expect(stdout.indexOf("thr_blocked")).toBeLessThan(
      stdout.indexOf("thr_done"),
    );
    expect(stdout.indexOf("thr_done")).toBeLessThan(
      stdout.indexOf("thr_canceled"),
    );
  });

  it("limits lists to thread IDs supplied by the host", () => {
    store.ensureThreads(["thr_visible", "thr_archived"]);
    const result = runThreadWorkflowCli(store, ["list", "--json"], {
      listThreadIds: ["thr_visible"],
    });
    expect(JSON.parse(result.stdout ?? "").map((task: { id: string }) => task.id)).toEqual([
      "thr_visible",
    ]);
  });

  it("moves a thread within its stage through update", () => {
    store.ensureThreads(["thr_a", "thr_b", "thr_c"]);

    const result = runThreadWorkflowCli(store, [
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
      workflowStage: "To do",
    });
  });

  it("appends a thread when changing its stage without position flags", () => {
    store.ensureThreads(["thr_first", "thr_second", "thr_moved"]);
    store.setStage("thr_first", "Working");
    store.setStage("thr_second", "Working");

    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_moved",
      "--stage",
      "Working",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.workflowStage === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_second", "thr_moved"]);
  });

  it("preserves position when updating to the current stage without position flags", () => {
    store.ensureThreads(["thr_first", "thr_middle", "thr_last"]);
    const before = store.get("thr_middle");

    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_middle",
      "--stage",
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
    store.setStage("thr_first", "Working");
    store.setStage("thr_second", "Working");

    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_moved",
      "--stage",
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
        .assignments.filter((assignment) => assignment.workflowStage === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_first", "thr_moved", "thr_second"]);
  });

  it("ignores and warns about neighbors outside the destination stage", () => {
    store.ensureThreads(["thr_working", "thr_done", "thr_moved"]);
    store.setStage("thr_working", "Working");
    store.setStage("thr_done", "Done");

    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_moved",
      "--stage",
      "Working",
      "--after",
      "thr_done",
      "--json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe(
      "Warning: --after thread thr_done is not in workflow stage Working; ignoring --after.\n",
    );
    expect(
      store
        .listState()
        .assignments.filter((assignment) => assignment.workflowStage === "Working")
        .map((assignment) => assignment.threadId),
    ).toEqual(["thr_working", "thr_moved"]);
  });

  it("applies a valid neighbor while ignoring an invalid one", () => {
    store.ensureThreads(["thr_first", "thr_second", "thr_done", "thr_moved"]);
    store.setStage("thr_first", "Working");
    store.setStage("thr_second", "Working");
    store.setStage("thr_done", "Done");

    const result = runThreadWorkflowCli(store, [
      "update",
      "thr_moved",
      "--stage",
      "Working",
      "--after",
      "thr_first",
      "--before",
      "thr_done",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("ignoring --before");
    expect(store.get("thr_moved").workflowStage).toBe("Working");
    expect(store.get("thr_moved").sortKey! > store.get("thr_first").sortKey!).toBe(
      true,
    );
  });

  it("prints update-specific ordering help", () => {
    const result = runThreadWorkflowCli(store, ["help", "update"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--after <id>");
    expect(result.stdout).toContain("--before <id>");
  });

  it("does not expose a standalone reorder command", () => {
    const result = runThreadWorkflowCli(store, ["reorder", "thr_a", "--after", "thr_b"]);
    expect(result).toMatchObject({
      exitCode: 2,
      stderr: expect.stringContaining("Unknown command: reorder"),
    });
  });

  it("returns actionable errors for missing changes and invalid stages", () => {
    expect(runThreadWorkflowCli(store, ["update", "thr_a"]).stderr).toContain(
      "Provide --stage, --after, or --before",
    );
    const invalid = runThreadWorkflowCli(store, [
      "update",
      "thr_a",
      "--stage",
      "paused",
    ]);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain("Backlog, To do, Working");
  });

  it("rejects stage reads and writes for child threads", () => {
    store.ensureThreads(["parent", "child"]);
    const rootIdsByThreadId = new Map<string, string | null>([
      ["parent", "parent"],
      ["child", "parent"],
    ]);

    const shown = runThreadWorkflowCli(store, ["show", "child"], { rootIdsByThreadId });
    const updated = runThreadWorkflowCli(
      store,
      ["update", "child", "--stage", "Done"],
      { rootIdsByThreadId },
    );

    expect(shown).toMatchObject({
      exitCode: 1,
      stderr: expect.stringContaining("root thread parent"),
    });
    expect(updated.exitCode).toBe(1);
    expect(store.get("parent").workflowStage).toBe("To do");
    expect(store.get("child").workflowStage).toBe("To do");
  });
});
