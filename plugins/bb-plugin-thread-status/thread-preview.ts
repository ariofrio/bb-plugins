import type { BbPluginApi } from "@bb/plugin-sdk";
import type { ThreadStatusStore } from "./store";
import type { ThreadLifecycleStatus } from "./task-workflow";

const MAX_PREVIEW_LENGTH = 500;

export interface ThreadPreviewRow {
  id: string;
  kind: string;
  sourceSeqEnd: number;
  role?: "user" | "assistant";
  text?: string;
  status?: "pending" | "completed" | "error" | "interrupted";
  systemKind?: string;
  title?: string;
  detail?: string | null;
  children?: readonly ThreadPreviewRow[] | null;
}

function oneLine(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  return normalized ? normalized.slice(0, MAX_PREVIEW_LENGTH) : null;
}

function prefixed(label: string, value: string | null): string {
  return (value ? `${label}: ${value}` : label).slice(0, MAX_PREVIEW_LENGTH);
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

export function deriveThreadPreview(
  threadStatus: ThreadLifecycleStatus,
  rows: readonly ThreadPreviewRow[],
): string | null {
  const flattened = flattenRows(rows);
  const latestUser = oneLine(
    latest(
      flattened,
      (row) => row.kind === "conversation" && row.role === "user",
    )?.text,
  );
  const latestAssistant = oneLine(
    latest(
      flattened,
      (row) => row.kind === "conversation" && row.role === "assistant",
    )?.text,
  );
  const latestError = latest(
    flattened,
    (row) => row.kind === "system" && row.systemKind === "error",
  );
  const errorMessage = oneLine(latestError?.title ?? latestError?.detail);

  if (threadStatus === "active" || threadStatus === "starting") {
    return latestUser;
  }
  if (threadStatus === "stopping") {
    return prefixed("Stopping", latestAssistant);
  }
  if (threadStatus === "error") {
    return prefixed("Error", errorMessage);
  }

  const turnStatus = latest(
    flattened,
    (row) => row.kind === "turn" && row.status !== undefined,
  )?.status;
  if (turnStatus === "interrupted") {
    return prefixed("Interrupted", latestAssistant);
  }
  if (turnStatus === "error") {
    return prefixed("Error", errorMessage);
  }
  return latestAssistant;
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
            const [thread, timeline] = await Promise.all([
              bb.sdk.threads.get({ threadId, signal }),
              bb.sdk.threads.timeline({
                threadId,
                includeNestedRows: "true",
                segmentLimit: "1",
                signal,
              }),
            ]);
            const preview = deriveThreadPreview(
              thread.status,
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
