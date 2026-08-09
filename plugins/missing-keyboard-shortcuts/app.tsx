import { definePluginApp, useBbNavigate } from "@bb/plugin-sdk/app";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  hasOpenComposer,
  openRegisteredComposer,
  registerOpenComposer,
} from "./composer-navigation-bridge";
import {
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
  newThreadTarget,
} from "./shortcut-actions";
import {
  openNewThread,
  type NewThreadHost,
} from "./new-thread-navigation";

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

function ComposerNavigationBridge() {
  const { toCompose } = useBbNavigate();
  useEffect(
    () =>
      registerOpenComposer(() => {
        toCompose({ focusPrompt: true });
      }),
    [toCompose],
  );
  return null;
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
  app.composer.customize({
    id: "navigation-bridge",
    banners: [
      {
        id: "navigation-bridge",
        chrome: "bare",
        component: ComposerNavigationBridge,
      },
    ],
  });

  app.contentScripts.register({
    id: "missing-keyboard-shortcuts",
    mount({ pluginId, signal }) {
      let archiveInFlight = false;
      const newThreadHost: NewThreadHost = {
        getSelectedProjectId() {
          return window.localStorage.getItem(
            ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
          );
        },
        selectProject(projectId) {
          window.localStorage.setItem(
            ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
            projectId,
          );
        },
        notifyProjectChanged(oldProjectId, newProjectId) {
          // BB's root composer also observes this event when it is already
          // mounted, such as Command-N pressed from the compose route itself.
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
              newValue: newProjectId,
              oldValue: oldProjectId,
              storageArea: window.localStorage,
              url: window.location.href,
            }),
          );
        },
        openComposer() {
          openRegisteredComposer();
        },
      };

      window.addEventListener(
        "keydown",
        (event) => {
          const target = newThreadTarget(event, window.location.pathname);
          if (target !== null) {
            // Claim the chord everywhere so BB's native menu cannot reuse it.
            event.preventDefault();
            event.stopPropagation();
            // Command-Shift-N has no same-project action when the route does
            // not select a thread, but the chord remains reserved.
            if (target.projectId === null) return;
            // The React bridge exists wherever BB has mounted a composer.
            if (!hasOpenComposer()) return;
            openNewThread(newThreadHost, target.projectId);
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
