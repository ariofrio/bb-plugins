import type { BbPluginApi } from "@bb/plugin-sdk";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import {
  isWorkingThreadStatus,
  registerTaskWorkflow,
} from "./task-workflow";

describe("task workflow", () => {
  it.each([
    ["starting", true],
    ["active", true],
    ["stopping", true],
    ["idle", false],
    ["error", false],
  ] as const)("maps %s to isWorking=%s", (status, expected) => {
    expect(isWorkingThreadStatus(status)).toBe(expected);
  });

  it("applies lifecycle events without overriding a manual move while work continues", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    const store = createThreadStatusStore(db);
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
      registerTaskWorkflow(bb, store);
      expect(services.has("task-workflow")).toBe(true);

      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("Working");

      store.setStatus("thr_a", "Blocked");
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("Blocked");
      expect(publish).toHaveBeenCalledTimes(1);
    } finally {
      db.close();
    }
  });

  it("treats a thread waiting on the user as To do while it stays active", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    const store = createThreadStatusStore(db);
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
      registerTaskWorkflow(bb, store);
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("Working");

      pendingInteractions = [{ status: "pending" }];
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("To do");

      // Answering it puts the thread back to work without a status change.
      pendingInteractions = [];
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("Working");
    } finally {
      db.close();
    }
  });

  it("ignores interactions that are no longer pending", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    const store = createThreadStatusStore(db);
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
      registerTaskWorkflow(bb, store);
      await handlers.get("thread.active")?.({
        thread: { id: "thr_a", status: "active" },
      } as never);
      expect(store.get("thr_a").taskStatus).toBe("Working");
    } finally {
      db.close();
    }
  });

  it("reconciles starting and stopping through thread status changes", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    const store = createThreadStatusStore(db);
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
      registerTaskWorkflow(bb, store);
      const running = Promise.resolve(service?.start(abort.signal));
      await vi.waitFor(() => expect(changed).not.toBeNull());

      changed?.({ id: "thr_a", changes: ["status-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").taskStatus).toBe("Working"),
      );

      pendingInteractions = [{ status: "pending" }];
      changed?.({ id: "thr_a", changes: ["interactions-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").taskStatus).toBe("To do"),
      );

      pendingInteractions = [];
      lifecycleStatus = "idle";
      changed?.({ id: "thr_a", changes: ["status-changed"] });
      await vi.waitFor(() =>
        expect(store.get("thr_a").taskStatus).toBe("To do"),
      );

      abort.abort();
      await running;
    } finally {
      abort.abort();
      db.close();
    }
  });
});
