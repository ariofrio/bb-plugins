import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
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

export const rpcContract = defineRpcContract({
  archiveThread: {
    input: z.object({ threadId: z.string().min(1) }).strict(),
    output: z.object({ archivedThreadIds: z.array(z.string()) }).strict(),
  },
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
});

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async archiveThread({ threadId }) {
      const result = await bb.sdk.threads.archiveAll({ threadId });
      return { archivedThreadIds: result.archivedThreadIds };
    },
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
  });

  bb.log.info("Missing native shortcuts loaded");
}
