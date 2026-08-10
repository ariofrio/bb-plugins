import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { createSideChatPanelTab } from "./terminal-panel-state";
import { selectReusableTerminalId } from "./terminal-selection";

const DEFAULT_TERMINAL_COLS = 100;
const DEFAULT_TERMINAL_ROWS = 30;

function terminalTabId(terminalId: string): string {
  return `terminal:${encodeURIComponent(terminalId)}:none`;
}

async function ensureThreadTerminalTab(
  bb: BbPluginApi,
  threadId: string,
  terminalId: string,
): Promise<void> {
  const id = terminalTabId(terminalId);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await bb.sdk.threads.tabs.get({ threadId });
    if (current.tabs.some((tab) => tab.id === id)) return;

    try {
      await bb.sdk.threads.tabs.update({
        expectedRevision: current.revision,
        tabs: [...current.tabs, { id, kind: "terminal", terminalId }],
        threadId,
      });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

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

      await ensureThreadTerminalTab(bb, threadId, terminalId);
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
  });

  bb.log.info("Missing native shortcuts loaded");
}
