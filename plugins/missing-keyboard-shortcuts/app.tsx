import { definePluginApp } from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import {
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
  newThreadTarget,
} from "./shortcut-actions";

const ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY = "bb.root-compose.project-id";

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

function openNewThread(path: string, projectId: string): void {
  // BB's root composer reads this selection on mount. The same-tab storage
  // event also updates an already-mounted composer before navigation.
  const oldValue = window.localStorage.getItem(
    ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
  );
  window.localStorage.setItem(ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY, projectId);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
      newValue: projectId,
      oldValue,
      storageArea: window.localStorage,
      url: window.location.href,
    }),
  );
  window.location.assign(path);
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "missing-keyboard-shortcuts",
    mount({ pluginId, signal }) {
      let archiveInFlight = false;

      window.addEventListener(
        "keydown",
        (event) => {
          const target = newThreadTarget(event, window.location.pathname);
          if (target !== null) {
            // Claim the chord everywhere, including editors, without letting
            // any downstream BB or editor handler act on the same keydown.
            event.preventDefault();
            event.stopPropagation();
            openNewThread(target.path, target.projectId);
            return;
          }

          const direction = historyDirection(event);
          if (direction !== null) {
            // Claim the shortcut even when an editor has focus.
            event.preventDefault();
            event.stopPropagation();
            window.history.go(direction);
            return;
          }

          if (!isArchiveShortcut(event)) return;

          const threadId = currentThreadId(window.location.pathname);
          if (threadId === null) return;

          // Claim the chord everywhere, including editors.
          event.preventDefault();
          event.stopPropagation();
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
