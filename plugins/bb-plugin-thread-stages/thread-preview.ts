import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { listAllThreads } from "./list-all-threads";
import type { ThreadWorkflowStore } from "./store";

const MAX_PREVIEW_LENGTH = 500;

/**
 * Events after which the newest message may have changed.
 *
 * `item/completed` is what keeps the subtitle current during a turn: an agent
 * that says something and then spends minutes on tool calls has already sent
 * its newest message, and waiting for the turn to end would leave the row
 * showing the user's message that whole time. It fires for every item, not
 * just messages, so most of these re-derive to the same text and stop at
 * setPreview; the redundant reads are the price of not knowing an item's kind
 * from the event alone.
 *
 * Deltas are deliberately absent. They arrive per token, and a subtitle that
 * retypes itself word by word costs a timeline read per token to do it.
 */
const MESSAGE_EVENT_TYPES = [
  "client/turn/requested",
  "turn/input/accepted",
  "system/manager/user_message",
  "item/completed",
];

export interface ThreadPreviewRow {
  kind: string;
  sourceSeqEnd: number;
  role?: "user" | "assistant";
  text?: string;
  children?: readonly ThreadPreviewRow[] | null;
}

function stripMarkdownFormatting(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/^\s{0,3}(?:`{3,}|~{3,}).*$/gm, " ")
    .replace(/^\s{0,3}\[[^\]]+\]:\s+\S+.*$/gm, " ")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(
      /!\[([^\]]*)\]\((?:\\.|[^\\()\n]|\([^()\n]*\))*\)/g,
      "$1",
    )
    .replace(
      /\[([^\]]+)\]\((?:\\.|[^\\()\n]|\([^()\n]*\))*\)/g,
      "$1",
    )
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<(https?:\/\/[^>]+|mailto:[^>]+)>/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, " ")
    .replace(/`+([^`\n]+?)`+/g, "$1")
    .replace(/(\*\*|__|~~)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/(^|[^\w])([*_])(?=\S)([^*_\n]*?\S)\2(?=$|[^\w])/g, "$1$3")
    .replace(
      /^\s{0,3}(?:#{1,6}\s+|(?:>\s*)+|[-+*]\s+|\d+[.)]\s+)/gm,
      "",
    )
    .replace(/^\s*\[[ xX]\]\s+/gm, "")
    .replace(/^\s{0,3}(?:={3,}|(?:[-*_]\s*){3,})$/gm, " ")
    .replace(/\\([\\`*{}\[\]()#+\-.!_>~|])/g, "$1");
}

function oneLine(value: string | null | undefined): string | null {
  const normalized = value
    ? stripMarkdownFormatting(value).replace(/\s+/g, " ").trim()
    : "";
  return normalized ? normalized.slice(0, MAX_PREVIEW_LENGTH) : null;
}

function flattenRows(rows: readonly ThreadPreviewRow[]): ThreadPreviewRow[] {
  const flattened: ThreadPreviewRow[] = [];
  for (const row of rows) {
    flattened.push(row);
    if (row.children) flattened.push(...flattenRows(row.children));
  }
  return flattened;
}

function latest(
  rows: readonly ThreadPreviewRow[],
  predicate: (row: ThreadPreviewRow) => boolean,
): ThreadPreviewRow | null {
  let result: ThreadPreviewRow | null = null;
  for (const row of rows) {
    if (
      predicate(row) &&
      (result === null || row.sourceSeqEnd > result.sourceSeqEnd)
    ) {
      result = row;
    }
  }
  return result;
}

/** The subtitle is the newest message, whether the user or the agent sent it. */
export function deriveThreadPreview(
  rows: readonly ThreadPreviewRow[],
): string | null {
  const latestMessage = latest(
    flattenRows(rows),
    (row) =>
      row.kind === "conversation" &&
      (row.role === "user" || row.role === "assistant"),
  );
  return oneLine(latestMessage?.text);
}

export function registerThreadPreviews(
  bb: BbPluginApi,
  store: ThreadWorkflowStore,
): void {
  bb.background.service("thread-previews", {
    async start(signal) {
      let queue = Promise.resolve();
      const timers = new Map<string, ReturnType<typeof setTimeout>>();
      let publishTimer: ReturnType<typeof setTimeout> | null = null;
      let pendingPublishThreadId: string | null | undefined;
      const publishChanged = (threadId: string) => {
        if (pendingPublishThreadId === undefined) {
          pendingPublishThreadId = threadId;
        } else if (pendingPublishThreadId !== threadId) {
          pendingPublishThreadId = null;
        }
        if (publishTimer) return;
        publishTimer = setTimeout(() => {
          bb.realtime.publish("previews-changed", {
            threadId: pendingPublishThreadId ?? null,
          });
          pendingPublishThreadId = undefined;
          publishTimer = null;
        }, 50);
      };
      const enqueue = (threadId: string) => {
        queue = queue
          .then(async () => {
            if (signal.aborted) return;
            const timeline = await bb.sdk.threads.timeline({
              threadId,
              includeNestedRows: "true",
              segmentLimit: "1",
              signal,
            });
            const preview = deriveThreadPreview(
              timeline.rows as ThreadPreviewRow[],
            );
            if (store.setPreview(threadId, preview)) {
              publishChanged(threadId);
            }
          })
          .catch((cause: unknown) => {
            if (!signal.aborted) {
              const message =
                cause instanceof Error ? cause.message : String(cause);
              bb.log.warn(
                `Could not derive thread preview for ${threadId}: ${message}`,
              );
            }
          });
      };
      const schedule = (threadId: string) => {
        const existing = timers.get(threadId);
        if (existing) clearTimeout(existing);
        timers.set(
          threadId,
          setTimeout(() => {
            timers.delete(threadId);
            enqueue(threadId);
          }, 50),
        );
      };

      const unsubscribe = bb.sdk.subscribe({
        event: "thread:changed",
        callback(event) {
          if (!event.id) return;
          const messageChanged = event.metadata?.eventTypes?.some((eventType) =>
            MESSAGE_EVENT_TYPES.includes(eventType),
          );
          if (event.changes.includes("status-changed") || messageChanged) {
            schedule(event.id);
          }
        },
      });

      try {
        const threads = await listAllThreads(({ limit, offset }) =>
          bb.sdk.threads.list({ limit, offset, signal }),
        );
        for (const thread of threads) enqueue(thread.id);

        if (!signal.aborted) {
          await new Promise<void>((resolve) => {
            signal.addEventListener("abort", () => resolve(), { once: true });
          });
        }
      } finally {
        unsubscribe();
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
        if (publishTimer) clearTimeout(publishTimer);
        await queue;
      }
    },
  });
}
