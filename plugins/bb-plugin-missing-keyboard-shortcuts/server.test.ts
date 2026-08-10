import { describe, expect, it, vi } from "vitest";

vi.mock("@bb/plugin-sdk", () => ({
  defineRpcContract: <Contract,>(contract: Contract) => contract,
}));

import type { BbPluginApi } from "@bb/plugin-sdk";
import plugin from "./server";

interface ValidateSideChatHandler {
  validateSideChat(input: {
    childThreadId: string;
    parentThreadId: string;
    tabId: string;
  }): Promise<{ reusable: boolean }>;
}

function serverHarness(options: {
  archivedAt: number | null;
  sourceThreadId?: string | null;
}) {
  const registered: { handlers?: ValidateSideChatHandler } = {};
  const getTabs = vi.fn(async () => ({
    revision: 4,
    tabs: [
      { id: "info", kind: "thread-info" },
      {
        id: "side-tab",
        kind: "plugin-panel",
        pluginId: "side-chat",
      },
    ],
  }));
  const updateTabs = vi.fn(async () => ({ revision: 5, tabs: [] }));
  const bb = {
    log: { info: vi.fn() },
    rpc: {
      register(_contract: unknown, nextHandlers: ValidateSideChatHandler) {
        registered.handlers = nextHandlers;
      },
    },
    sdk: {
      threads: {
        get: vi.fn(async () => ({
          archivedAt: options.archivedAt,
          originKind: "fork",
          originPluginId: "side-chat",
          sourceThreadId: options.sourceThreadId ?? "thr_parent",
          visibility: "hidden",
        })),
        tabs: { get: getTabs, update: updateTabs },
      },
    },
  };
  plugin(bb as unknown as BbPluginApi);
  const handlers = registered.handlers;
  if (handlers === undefined) throw new Error("RPC handlers were not registered");
  return { getTabs, handlers, updateTabs };
}

describe("validateSideChat RPC", () => {
  it("keeps a live child belonging to the requested parent", async () => {
    const { handlers, updateTabs } = serverHarness({ archivedAt: null });

    await expect(
      handlers.validateSideChat({
        childThreadId: "thr_child",
        parentThreadId: "thr_parent",
        tabId: "side-tab",
      }),
    ).resolves.toEqual({ reusable: true });
    expect(updateTabs).not.toHaveBeenCalled();
  });

  it("prunes an archived child's persisted tab", async () => {
    const { handlers, updateTabs } = serverHarness({ archivedAt: 123 });

    await expect(
      handlers.validateSideChat({
        childThreadId: "thr_child",
        parentThreadId: "thr_parent",
        tabId: "side-tab",
      }),
    ).resolves.toEqual({ reusable: false });
    expect(updateTabs).toHaveBeenCalledWith({
      expectedRevision: 4,
      tabs: [{ id: "info", kind: "thread-info" }],
      threadId: "thr_parent",
    });
  });
});
