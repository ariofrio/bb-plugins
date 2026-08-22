import type { BbPluginApi } from "@get-bb/plugin-sdk";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveEligibleCompletedThreads,
  autoArchiveDelayMs,
} from "./auto-archive";
import {
  THREAD_WORKFLOW_MIGRATIONS,
  createThreadWorkflowStore,
} from "./store";

const DAY = 24 * 60 * 60 * 1_000;

function thread(
  id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    parentThreadId: null,
    visibility: "visible",
    archivedAt: null,
    pinnedAt: null,
    lastReadAt: 20,
    latestAttentionAt: 10,
    hasPendingInteraction: false,
    status: "idle",
    runtime: { displayStatus: "idle", hostReconnectGraceExpiresAt: null },
    activity: {
      activeBackgroundAgentCount: 0,
      activeBackgroundCommandCount: 0,
      activeGoalCount: 0,
      activePlanModeCount: 0,
      activeWorkflowCount: 0,
    },
    ...overrides,
  };
}

afterEach(() => vi.useRealTimers());

describe("completed auto-archive", () => {
  it("maps each retention choice and keeps Never disabled", () => {
    expect(autoArchiveDelayMs("Never")).toBeNull();
    expect(autoArchiveDelayMs("1 day")).toBe(DAY);
    expect(autoArchiveDelayMs("7 days")).toBe(7 * DAY);
    expect(autoArchiveDelayMs("30 days")).toBe(30 * DAY);
  });

  it("archives only safe roots that have remained Completed long enough", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    vi.useFakeTimers();
    const now = 10 * DAY;
    vi.setSystemTime(now - 2 * DAY);
    for (const id of [
      "safe",
      "pinned",
      "unread",
      "running",
      "waiting",
      "active-parent",
      "recent",
    ]) {
      store.setStage(id, "Completed");
    }
    vi.setSystemTime(now);
    store.setStage("recent", "Idle");
    store.setStage("recent", "Completed");

    const threads = [
      thread("safe"),
      thread("pinned", { pinnedAt: 1 }),
      thread("unread", { lastReadAt: null }),
      thread("running", { status: "active" }),
      thread("waiting", { hasPendingInteraction: true }),
      thread("active-parent"),
      thread("active-child", {
        parentThreadId: "active-parent",
        status: "active",
      }),
      thread("recent"),
    ];
    const archive = vi.fn(async () => ({}));
    const bb = {
      sdk: {
        threads: {
          list: vi.fn(async () => threads),
          archive,
        },
      },
      log: { warn: vi.fn(), info: vi.fn() },
    } as unknown as BbPluginApi;

    try {
      await expect(
        archiveEligibleCompletedThreads(bb, store, DAY, now),
      ).resolves.toEqual(["safe"]);
      expect(archive).toHaveBeenCalledWith({ threadId: "safe" });
      expect(store.get("safe").workflowStage).toBe("Completed");
    } finally {
      db.close();
    }
  });
});
