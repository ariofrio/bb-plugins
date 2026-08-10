import type { BbPluginApi } from "@bb/plugin-sdk";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import {
  deriveThreadPreview,
  registerThreadPreviews,
} from "./thread-preview";

const user = {
  id: "user",
  kind: "conversation",
  role: "user",
  text: "  Latest\nuser   message  ",
  sourceSeqEnd: 10,
} as const;
const assistant = {
  id: "assistant",
  kind: "conversation",
  role: "assistant",
  text: "Latest assistant message",
  sourceSeqEnd: 20,
} as const;
const error = {
  id: "error",
  kind: "system",
  systemKind: "error",
  title: "Provider error",
  detail: "Connection failed",
  sourceSeqEnd: 30,
} as const;

describe("thread preview", () => {
  it.each([
    ["starting", "Latest user message"],
    ["active", "Latest user message"],
    ["stopping", "Stopping: Latest assistant message"],
  ] as const)("formats a %s thread", (status, expected) => {
    expect(deriveThreadPreview(status, [user, assistant])).toBe(expected);
  });

  it.each([
    ["completed", "Latest assistant message"],
    ["interrupted", "Interrupted: Latest assistant message"],
    ["error", "Error: Provider error"],
  ] as const)("formats an idle %s turn", (turnStatus, expected) => {
    expect(
      deriveThreadPreview("idle", [
        {
          id: "turn",
          kind: "turn",
          status: turnStatus,
          sourceSeqEnd: 40,
          children: [user, assistant, error],
        },
      ]),
    ).toBe(expected);
  });

  it("formats a thread lifecycle error independently of turn status", () => {
    expect(deriveThreadPreview("error", [user, assistant, error])).toBe(
      "Error: Provider error",
    );
  });

  it("reconciles and publishes persisted previews from bb timelines", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_STATUS_MIGRATIONS) db.exec(migration);
    const store = createThreadStatusStore(db);
    let service: { start(signal: AbortSignal): unknown } | null = null;
    let changed:
      | ((event: {
          id?: string;
          changes: readonly string[];
          metadata?: { eventTypes?: readonly string[] };
        }) => void)
      | null = null;
    const publish = vi.fn();
    const timeline = vi.fn(async () => ({ rows: [user, assistant] }));
    const bb = {
      background: {
        service: (
          _name: string,
          registered: { start(signal: AbortSignal): unknown },
        ) => {
          service = registered;
        },
      },
      realtime: { publish },
      log: { warn: vi.fn() },
      sdk: {
        subscribe: ({ callback }: { callback: typeof changed }) => {
          changed = callback;
          return () => undefined;
        },
        threads: {
          list: async () => [{ id: "thr_a" }],
          get: async () => ({ id: "thr_a", status: "active" }),
          timeline,
        },
      },
    } as unknown as BbPluginApi;
    const abort = new AbortController();

    try {
      registerThreadPreviews(bb, store);
      const running = Promise.resolve(service?.start(abort.signal));

      await vi.waitFor(() =>
        expect(store.listPreviews()).toEqual([
          { threadId: "thr_a", preview: "Latest user message" },
        ]),
      );
      await vi.waitFor(() =>
        expect(publish).toHaveBeenCalledWith("previews-changed", {
          threadId: "thr_a",
        }),
      );

      changed?.({
        id: "thr_a",
        changes: ["events-appended"],
        metadata: { eventTypes: ["item/agentMessage/delta"] },
      });
      await new Promise((resolve) => setTimeout(resolve, 75));
      expect(timeline).toHaveBeenCalledTimes(1);

      changed?.({
        id: "thr_a",
        changes: ["events-appended"],
        metadata: { eventTypes: ["turn/input/accepted"] },
      });
      await vi.waitFor(() => expect(timeline).toHaveBeenCalledTimes(2));

      abort.abort();
      await running;
    } finally {
      abort.abort();
      db.close();
    }
  });
});
