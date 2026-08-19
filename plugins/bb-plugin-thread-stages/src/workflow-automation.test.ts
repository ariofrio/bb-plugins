import type { BbPluginApi } from "@get-bb/plugin-sdk";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import {
  THREAD_WORKFLOW_MIGRATIONS,
  createThreadWorkflowStore,
} from "./store";
import {
  isWorkingThreadLifecycle,
  registerThreadWorkflow,
} from "./workflow-automation";

describe("task workflow", () => {
  it.each([
    ["starting", true],
    ["active", true],
    ["stopping", true],
    ["idle", false],
    ["error", false],
  ] as const)("maps %s to isWorking=%s", (status, expected) => {
    expect(isWorkingThreadLifecycle(status)).toBe(expected);
  });

  it("applies lifecycle events without overriding a manual move while work continues", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    const handlers = new Map<string, (payload: never) => unknown>();
    const services = new Map<string, { start(signal: AbortSignal): unknown }>();
    const publish = vi.fn();
    let pendingInteractions: Array<{ status: string }> = [];
    const bb = {
      events: {
        on: (event: string, handler: (payload: never) => unknown) => {
          handlers.set(event, handler);
        },
      },
      background: {
        service: (
          name: string,
          service: { start(signal: AbortSignal): unknown },
        ) => services.set(name, service),
      },
      realtime: { publish },
      log: { warn: vi.fn() },
      sdk: {
        threads: {
          interactions: { list: async () => pendingInteractions },
        },
      },
    } as unknown as BbPluginApi;

    try {
      registerThreadWorkflow(bb, store);
      expect(services.has("stage-automation")).toBe(true);

      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("Working");

      store.setStage("thr_a", "Blocked");
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("Blocked");
      expect(publish).toHaveBeenCalledTimes(1);
    } finally {
      db.close();
    }
  });

  it("removes stale task state instead of observing a child thread", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    const handlers = new Map<string, (payload: never) => unknown>();
    const publish = vi.fn();
    const bb = {
      events: {
        on: (event: string, handler: (payload: never) => unknown) => {
          handlers.set(event, handler);
        },
      },
      background: { service: () => undefined },
      realtime: { publish },
      log: { warn: vi.fn() },
      sdk: {
        threads: { interactions: { list: vi.fn() } },
      },
    } as unknown as BbPluginApi;

    try {
      store.ensureThreads(["child"]);
      store.setStage("child", "Done");
      registerThreadWorkflow(bb, store);

      await handlers.get("thread.active")?.({
        thread: {
          id: "child",
          parentThreadId: "parent",
          status: "active",
        },
      } as never);

      expect(store.get("child").explicit).toBe(false);
      expect(bb.sdk.threads.interactions.list).not.toHaveBeenCalled();
      expect(publish).toHaveBeenCalledWith("state-changed", {
        threadId: "child",
      });
    } finally {
      db.close();
    }
  });

  it("treats a thread waiting on the user as To do while it stays active", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    const handlers = new Map<string, (payload: never) => unknown>();
    let pendingInteractions: Array<{ status: string }> = [];
    const bb = {
      events: {
        on: (event: string, handler: (payload: never) => unknown) => {
          handlers.set(event, handler);
        },
      },
      background: { service: () => undefined },
      realtime: { publish: vi.fn() },
      log: { warn: vi.fn() },
      sdk: {
        threads: {
          interactions: { list: async () => pendingInteractions },
        },
      },
    } as unknown as BbPluginApi;

    try {
      registerThreadWorkflow(bb, store);
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("Working");

      pendingInteractions = [{ status: "pending" }];
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("To do");

      // Answering it puts the thread back to work without a status change.
      pendingInteractions = [];
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("Working");
    } finally {
      db.close();
    }
  });

  it("ignores interactions that are no longer pending", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    const handlers = new Map<string, (payload: never) => unknown>();
    const bb = {
      events: {
        on: (event: string, handler: (payload: never) => unknown) => {
          handlers.set(event, handler);
        },
      },
      background: { service: () => undefined },
      realtime: { publish: vi.fn() },
      log: { warn: vi.fn() },
      sdk: {
        threads: {
          interactions: {
            list: async () => [{ status: "resolving" }, { status: "resolved" }],
          },
        },
      },
    } as unknown as BbPluginApi;

    try {
      registerThreadWorkflow(bb, store);
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").workflowStage).toBe("Working");
    } finally {
      db.close();
    }
  });

  it("reconciles starting and stopping through thread status changes", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    let changed: ((event: {
      id?: string;
      changes: readonly string[];
    }) => void) | null = null;
    let lifecycleStatus = "stopping" as "stopping" | "idle";
    let pendingInteractions: Array<{ status: string }> = [];
    let service: { start(signal: AbortSignal): unknown } | null = null;
    const bb = {
      events: { on: () => undefined },
      background: {
        service: (
          _name: string,
          registered: { start(signal: AbortSignal): unknown },
        ) => {
          service = registered;
        },
      },
      realtime: { publish: vi.fn() },
      log: { warn: vi.fn() },
      sdk: {
        subscribe: ({ callback }: { callback: typeof changed }) => {
          changed = callback;
          return () => undefined;
        },
        threads: {
          interactions: { list: async () => pendingInteractions },
          list: async () => [],
          get: async ({ threadId }: { threadId: string }) => ({
            id: threadId,
            status: lifecycleStatus,
          }),
        },
      },
    } as unknown as BbPluginApi;

    const abort = new AbortController();
    try {
      registerThreadWorkflow(bb, store);
      const running = Promise.resolve(service?.start(abort.signal));
      await vi.waitFor(() => expect(changed).not.toBeNull());

      changed?.({ id: "thr_a", changes: ["status-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").workflowStage).toBe("Working"),
      );

      pendingInteractions = [{ status: "pending" }];
      changed?.({ id: "thr_a", changes: ["interactions-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").workflowStage).toBe("To do"),
      );

      pendingInteractions = [];
      lifecycleStatus = "idle";
      changed?.({ id: "thr_a", changes: ["status-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").workflowStage).toBe("To do"),
      );

      abort.abort();
      await running;
    } finally {
      abort.abort();
      db.close();
    }
  });
});
