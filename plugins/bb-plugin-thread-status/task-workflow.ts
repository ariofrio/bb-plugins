import type { BbPluginApi } from "@bb/plugin-sdk";
import type { ThreadStatusStore } from "./store";

export type ThreadLifecycleStatus =
  | "idle"
  | "active"
  | "starting"
  | "stopping"
  | "error";

export function isWorkingThreadStatus(
  status: ThreadLifecycleStatus,
): boolean {
  switch (status) {
    case "active":
    case "starting":
    case "stopping":
      return true;
    case "idle":
    case "error":
      return false;
  }
}

interface WorkflowThread {
  id: string;
  status: ThreadLifecycleStatus;
}

export function registerTaskWorkflow(
  bb: BbPluginApi,
  store: ThreadStatusStore,
): void {
  const observe = (thread: WorkflowThread) => {
    const result = store.observeWorkingState(
      thread.id,
      isWorkingThreadStatus(thread.status),
    );
    if (result.taskStatusChanged) {
      bb.realtime.publish("state-changed", { threadId: thread.id });
    }
  };

  bb.events.on("thread.created", ({ thread }) => observe(thread));
  bb.events.on("thread.active", ({ thread }) => observe(thread));
  bb.events.on("thread.idle", ({ thread }) => observe(thread));
  bb.events.on("thread.failed", ({ thread }) => observe(thread));

  bb.background.service("task-workflow", {
    async start(signal) {
      let queue = Promise.resolve();
      const enqueue = (threadId: string) => {
        queue = queue
          .then(async () => {
            if (signal.aborted) return;
            const thread = await bb.sdk.threads.get({ threadId, signal });
            observe(thread);
          })
          .catch((error: unknown) => {
            if (!signal.aborted) {
              const message =
                error instanceof Error ? error.message : String(error);
              bb.log.warn(
                `Could not reconcile task workflow state for ${threadId}: ${message}`,
              );
            }
          });
      };

      const unsubscribe = bb.sdk.subscribe({
        event: "thread:changed",
        callback(event) {
          if (event.id && event.changes.includes("status-changed")) {
            enqueue(event.id);
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
        await queue;
      }
    },
  });
}
