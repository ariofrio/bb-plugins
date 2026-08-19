import type { BbPluginApi } from "@get-bb/plugin-sdk";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import {
  THREAD_WORKFLOW_MIGRATIONS,
  createThreadWorkflowStore,
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
const turn = {
  id: "turn",
  kind: "turn",
  status: "completed",
  sourceSeqEnd: 40,
} as const;

describe("thread preview", () => {
  it("renders Markdown message content as plain-text subtitle text", () => {
    expect(
      deriveThreadPreview([
        {
          ...user,
          text: [
            "## **Fix** the [sidebar](https://example.com/sidebar)",
            "",
            "> Keep `drag and drop` working.",
            "",
            "- ~~Remove~~ formatting",
          ].join("\n"),
        },
      ]),
    ).toBe("Fix the sidebar Keep drag and drop working. Remove formatting");
  });

  it("keeps readable content from fenced code, images, and setext headings", () => {
    expect(
      deriveThreadPreview([
        {
          ...assistant,
          text: [
            "Release notes",
            "=============",
            "",
            "![Sidebar preview](https://example.com/sidebar.png)",
            "",
            "```ts",
            "const ready = true;",
            "```",
          ].join("\n"),
        },
      ]),
    ).toBe("Release notes Sidebar preview const ready = true;");
  });

  it("strips nested quotes, task markers, and reference-style image syntax", () => {
    expect(
      deriveThreadPreview([
        {
          ...user,
          text: [
            "> > [Details](https://example.com/docs_(draft))",
            "- [x] ![Complete][status]",
            "",
            "[status]: /status.png",
          ].join("\n"),
        },
      ]),
    ).toBe("Details Complete");
  });

  it("shows the latest message whichever side sent it", () => {
    expect(deriveThreadPreview([user, assistant])).toBe(
      "Latest assistant message",
    );
    expect(
      deriveThreadPreview([assistant, { ...user, sourceSeqEnd: 30 }]),
    ).toBe("Latest user message");
  });

  it("finds messages nested inside turns", () => {
    expect(
      deriveThreadPreview([{ ...turn, children: [user, assistant] }]),
    ).toBe("Latest assistant message");
  });

  it("ignores rows that are not conversation messages", () => {
    expect(deriveThreadPreview([user, assistant, error])).toBe(
      "Latest assistant message",
    );
    expect(deriveThreadPreview([error])).toBeNull();
    expect(deriveThreadPreview([])).toBeNull();
  });

  it("reconciles and publishes persisted previews from bb timelines", async () => {
    const db = new Database(":memory:");
    for (const migration of THREAD_WORKFLOW_MIGRATIONS) db.exec(migration);
    const store = createThreadWorkflowStore(db);
    let service = null as { start(signal: AbortSignal): unknown } | null;
    let changed = null as
      | ((event: {
          id?: string;
          changes: readonly string[];
          metadata?: { eventTypes?: readonly string[] };
        }) => void)
      | null;
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
          { threadId: "thr_a", preview: "Latest assistant message" },
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

      // A message the agent finishes mid-turn is the newest message from that
      // moment on, even though the turn runs for several more minutes.
      changed?.({
        id: "thr_a",
        changes: ["events-appended"],
        metadata: { eventTypes: ["item/completed"] },
      });
      await vi.waitFor(() => expect(timeline).toHaveBeenCalledTimes(2));

      changed?.({
        id: "thr_a",
        changes: ["events-appended"],
        metadata: { eventTypes: ["turn/input/accepted"] },
      });
      await vi.waitFor(() => expect(timeline).toHaveBeenCalledTimes(3));

      abort.abort();
      await running;
    } finally {
      abort.abort();
      db.close();
    }
  });
});
