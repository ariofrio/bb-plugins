import type { BbPluginApi } from "@bb/plugin-sdk";
import type { ThreadStatusStore } from "./store";

const MAX_PREVIEW_LENGTH = 500;

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
  store: ThreadStatusStore,
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
          const inputChanged = event.metadata?.eventTypes?.some((eventType) =>
            [
              "client/turn/requested",
              "turn/input/accepted",
              "system/manager/user_message",
            ].includes(eventType),
          );
          if (event.changes.includes("status-changed") || inputChanged) {
            schedule(event.id);
          }
        },
      });

      try {
        const threads = await bb.sdk.threads.list({ signal });
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
