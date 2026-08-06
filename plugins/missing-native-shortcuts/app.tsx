import { definePluginApp } from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import {
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
} from "./shortcut-actions";

interface ArchiveResult {
  archivedThreadIds: string[];
}

type RpcEnvelope =
  | { ok: true; result: ArchiveResult }
  | { ok: false; error: unknown };

function rpcErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Failed to archive thread";
}

async function archiveThread(
  pluginId: string,
  threadId: string,
): Promise<ArchiveResult> {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/archiveThread`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId }),
      credentials: "same-origin",
    },
  );
  const envelope = (await response.json()) as RpcEnvelope;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok
        ? rpcErrorMessage(envelope.error)
        : `Archive request failed (${response.status})`,
    );
  }
  return envelope.result;
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "missing-native-shortcuts",
    mount({ pluginId, signal }) {
      let archiveInFlight = false;

      window.addEventListener(
        "keydown",
        (event) => {
          const direction = historyDirection(event);
          if (direction !== null) {
            // Claim the shortcut even when an editor has focus. Let BB observe
            // the keydown so it cancels its delayed Command-key hint timer.
            event.preventDefault();
            window.history.go(direction);
            return;
          }

          if (!isArchiveShortcut(event)) return;

          const threadId = currentThreadId(window.location.pathname);
          if (threadId === null) return;

          // Claim the chord everywhere, including editors. Let it continue to
          // BB's listeners so the delayed Command-key hint timer is cancelled;
          // BB's command dispatcher ignores an already-prevented event.
          event.preventDefault();
          if (archiveInFlight) return;

          archiveInFlight = true;
          void archiveThread(pluginId, threadId)
            .then(({ archivedThreadIds }) => {
              toast.success(
                archivedThreadIds.length > 1
                  ? `Archived thread and ${archivedThreadIds.length - 1} children`
                  : "Archived thread",
              );
            })
            .catch((error: unknown) => {
              toast.error(rpcErrorMessage(error));
            })
            .finally(() => {
              archiveInFlight = false;
            });
        },
        { capture: true, signal },
      );
    },
  });
});
