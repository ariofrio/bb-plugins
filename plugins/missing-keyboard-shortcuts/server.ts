import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { createSideChatPanelTab } from "./terminal-panel-state";
import { selectReusableTerminalId } from "./terminal-selection";

const DEFAULT_TERMINAL_COLS = 100;
const DEFAULT_TERMINAL_ROWS = 30;

async function ensureThreadSideChatTab(
  bb: BbPluginApi,
  parentThreadId: string,
  childThreadId: string,
): Promise<string> {
  const { childThreadId: _childThreadId, ...tab } = createSideChatPanelTab(
    parentThreadId,
    childThreadId,
  );
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await bb.sdk.threads.tabs.get({ threadId: parentThreadId });
    if (current.tabs.some(({ id }) => id === tab.id)) return tab.id;

    try {
      await bb.sdk.threads.tabs.update({
        expectedRevision: current.revision,
        tabs: [...current.tabs, tab],
        threadId: parentThreadId,
      });
      return tab.id;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
  return tab.id;
}

async function removeThreadTab(
  bb: BbPluginApi,
  threadId: string,
  tabId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await bb.sdk.threads.tabs.get({ threadId });
    const tabs = current.tabs.filter(({ id }) => id !== tabId);
    if (tabs.length === current.tabs.length) return;
    try {
      await bb.sdk.threads.tabs.update({
        expectedRevision: current.revision,
        tabs,
        threadId,
      });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

export const rpcContract = defineRpcContract({
  openTerminal: {
    input: z
      .object({
        preferredTerminalId: z.string().min(1).nullable(),
        threadId: z.string().min(1),
      })
      .strict(),
    output: z
      .object({ terminalId: z.string().min(1), created: z.boolean() })
      .strict(),
  },
  ensureSideChatTab: {
    input: z
      .object({
        childThreadId: z.string().min(1),
        parentThreadId: z.string().min(1),
      })
      .strict(),
    output: z.object({ tabId: z.string().min(1) }).strict(),
  },
  validateSideChat: {
    input: z
      .object({
        childThreadId: z.string().min(1),
        parentThreadId: z.string().min(1),
        tabId: z.string().min(1),
      })
      .strict(),
    output: z.object({ reusable: z.boolean() }).strict(),
  },
});

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async openTerminal({ preferredTerminalId, threadId }) {
      const { sessions } = await bb.sdk.terminals.list({
        scope: { kind: "thread", threadId },
      });
      let terminalId = selectReusableTerminalId(
        sessions,
        preferredTerminalId,
      );
      let created = false;
      if (terminalId === null) {
        const session = await bb.sdk.terminals.create({
          cols: DEFAULT_TERMINAL_COLS,
          rows: DEFAULT_TERMINAL_ROWS,
          scope: { kind: "thread", threadId },
        });
        terminalId = session.id;
        created = true;
      }

      return { terminalId, created };
    },
    async ensureSideChatTab({ childThreadId, parentThreadId }) {
      const tabId = await ensureThreadSideChatTab(
        bb,
        parentThreadId,
        childThreadId,
      );
      return { tabId };
    },
    async validateSideChat({ childThreadId, parentThreadId, tabId }) {
      const child = await bb.sdk.threads.get({ threadId: childThreadId });
      const reusable =
        child.archivedAt === null &&
        child.originKind === "fork" &&
        child.originPluginId === "side-chat" &&
        child.sourceThreadId === parentThreadId &&
        child.visibility === "hidden";
      if (!reusable) await removeThreadTab(bb, parentThreadId, tabId);
      return { reusable };
    },
  });

  bb.log.info("Missing native shortcuts loaded");
}
