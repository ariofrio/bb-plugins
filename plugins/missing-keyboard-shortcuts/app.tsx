import {
  definePluginApp,
  useBbContext,
  useBbNavigate,
  useComposer,
  useComposerView,
} from "@bb/plugin-sdk/app";
import { createElement, useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import {
  focusedSecondaryComposerThreadId,
  focusPrimaryComposer,
  focusSecondaryComposer as focusRegisteredSecondaryComposer,
  hasPrimaryComposer,
  hasOpenComposer,
  isSecondaryComposerFocused,
  openRegisteredComposer,
  registerOpenComposer,
  registerPrimaryComposerFocus,
  registerSecondaryComposer,
} from "./composer-navigation-bridge";
import {
  readLastThreadProjectId,
  rememberThreadProject,
} from "./last-thread-project";
import {
  composerShortcutTarget,
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
  isTerminalShortcut,
  newThreadTarget,
} from "./shortcut-actions";
import {
  openNewThread,
  type NewThreadHost,
} from "./new-thread-navigation";
import {
  activateExistingSideChatPanel,
  activateSideChatPanel,
  activateTerminalPanel,
  closePanel,
  createSideChatPanelTab,
  readRecentSideChatTabId,
  readRecentTerminalId,
  readSideChatPanelSnapshot,
  readTerminalPanelSnapshot,
  rememberRecentSideChatTabId,
  rememberRecentTerminalId,
  selectSideChatPanelTab,
  shouldCloseTerminalPanel,
  type PanelStorageChange,
} from "./terminal-panel-state";

const ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY = "bb.root-compose.project-id";

interface ArchiveResult {
  archivedThreadIds: string[];
}

interface OpenTerminalResult {
  created: boolean;
  terminalId: string;
}

interface CreateSideChatResult {
  threadId: string;
}

type RpcEnvelope<Result> =
  | { ok: true; result: Result }
  | { ok: false; error: unknown };

function rpcErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function ComposerNavigationBridge() {
  const context = useBbContext();
  const { toCompose } = useBbNavigate();
  const composer = useComposer();
  const view = useComposerView();
  const markerRef = useRef<HTMLSpanElement>(null);
  const composerThreadId =
    view.scope.kind === "thread" ? view.scope.threadId : null;
  useEffect(() => {
    rememberThreadProject(window.localStorage, context);
  }, [context.projectId, context.threadId]);
  useEffect(
    () =>
      registerOpenComposer(() => {
        toCompose({ focusPrompt: true });
      }),
    [toCompose],
  );
  useLayoutEffect(() => {
    const marker = markerRef.current;
    const composerElement = marker?.closest<HTMLElement>(
      "[data-app-composer-role]",
    );
    const role = composerElement?.getAttribute("data-app-composer-role");
    if (role === "primary") {
      if (view.scope.kind === "thread") {
        return registerPrimaryComposerFocus(
          view.scope.threadId,
          composer.focus,
        );
      }
      if (view.scope.kind === "new-thread") {
        return registerPrimaryComposerFocus(null, composer.focus);
      }
      return;
    }
    if (
      role !== "secondary" ||
      context.threadId === null ||
      composerThreadId === null ||
      composerThreadId === context.threadId ||
      composerElement === null ||
      composerElement === undefined
    ) {
      return;
    }
    return registerSecondaryComposer(context.threadId, composerThreadId, {
      focus: composer.focus,
      isFocused: () => composerElement.contains(document.activeElement),
      isVisible: () => {
        const bounds = composerElement.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      },
    });
  }, [composer.focus, composerThreadId, context.threadId, view.scope.kind]);
  return createElement("span", { hidden: true, ref: markerRef });
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
  const envelope = (await response.json()) as RpcEnvelope<ArchiveResult>;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok
        ? rpcErrorMessage(envelope.error, "Failed to archive thread")
        : `Archive request failed (${response.status})`,
    );
  }
  return envelope.result;
}

async function openTerminal(
  pluginId: string,
  threadId: string,
  preferredTerminalId: string | null,
): Promise<OpenTerminalResult> {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/openTerminal`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredTerminalId, threadId }),
      credentials: "same-origin",
    },
  );
  const envelope = (await response.json()) as RpcEnvelope<OpenTerminalResult>;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok
        ? rpcErrorMessage(envelope.error, "Failed to open terminal")
        : `Terminal request failed (${response.status})`,
    );
  }
  return envelope.result;
}

async function createSideChat(
  pluginId: string,
  threadId: string,
): Promise<CreateSideChatResult> {
  const response = await fetch(
    "/api/v1/plugins/side-chat/rpc/createSideChat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceThreadId: threadId,
        anchorText: "",
      }),
      credentials: "same-origin",
    },
  );
  const envelope = (await response.json()) as RpcEnvelope<CreateSideChatResult>;
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok
        ? rpcErrorMessage(envelope.error, "Failed to start side chat")
        : `Side-chat request failed (${response.status})`,
    );
  }
  const result = envelope.result;
  const persistResponse = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/ensureSideChatTab`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childThreadId: result.threadId,
        parentThreadId: threadId,
      }),
      credentials: "same-origin",
    },
  );
  const persistEnvelope = (await persistResponse.json()) as RpcEnvelope<{
    tabId: string;
  }>;
  if (!persistResponse.ok || !persistEnvelope.ok) {
    throw new Error(
      !persistEnvelope.ok
        ? rpcErrorMessage(persistEnvelope.error, "Failed to persist side chat")
        : `Side-chat tab request failed (${persistResponse.status})`,
    );
  }
  return result;
}

function notifyPanelStateChanged(change: PanelStorageChange): void {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: change.key,
      newValue: change.newValue,
      oldValue: change.oldValue,
      storageArea: window.localStorage,
      url: window.location.href,
    }),
  );
}

function isTerminalFocused(): boolean {
  return (
    document.activeElement instanceof Element &&
    document.activeElement.closest("[data-app-terminal]") !== null
  );
}

function focusTerminal(signal: AbortSignal, threadId: string): void {
  const tryFocus = (): boolean => {
    const visibleTerminal = Array.from(
      document.querySelectorAll<HTMLElement>("[data-app-terminal]"),
    ).find((terminal) => {
      const bounds = terminal.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0;
    });
    const focusTarget = visibleTerminal?.querySelector<HTMLElement>(
      ".xterm-helper-textarea, textarea",
    );
    if (focusTarget === null || focusTarget === undefined) return false;
    focusTarget.focus({ preventScroll: true });
    return true;
  };

  let attemptsRemaining = 120;
  let animationFrame: number | null = null;
  const stop = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    signal.removeEventListener("abort", stop);
  };
  const attemptFocus = () => {
    animationFrame = null;
    if (
      signal.aborted ||
      currentThreadId(window.location.pathname) !== threadId ||
      tryFocus() ||
      attemptsRemaining <= 0
    ) {
      stop();
      return;
    }
    attemptsRemaining -= 1;
    animationFrame = window.requestAnimationFrame(attemptFocus);
  };
  signal.addEventListener("abort", stop, { once: true });
  attemptFocus();
}

function focusSideChatComposer(
  signal: AbortSignal,
  parentThreadId: string,
  childThreadId: string,
): void {
  let attemptsRemaining = 120;
  let animationFrame: number | null = null;
  const stop = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    signal.removeEventListener("abort", stop);
  };
  const attemptFocus = () => {
    animationFrame = null;
    if (
      signal.aborted ||
      currentThreadId(window.location.pathname) !== parentThreadId ||
      focusRegisteredSecondaryComposer(parentThreadId, childThreadId) ||
      attemptsRemaining <= 0
    ) {
      stop();
      return;
    }
    attemptsRemaining -= 1;
    animationFrame = window.requestAnimationFrame(attemptFocus);
  };
  signal.addEventListener("abort", stop, { once: true });
  attemptFocus();
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
      let sideChatInFlight = false;
      let terminalInFlight = false;
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
        "focusin",
        (event) => {
          if (!(event.target instanceof Element)) return;
          const threadId = currentThreadId(window.location.pathname);
          if (threadId === null) return;
          if (event.target.closest("[data-app-terminal]") !== null) {
            const { activeTerminalId } = readTerminalPanelSnapshot(
              window.localStorage,
              threadId,
            );
            if (activeTerminalId !== null) {
              rememberRecentTerminalId(
                window.localStorage,
                threadId,
                activeTerminalId,
              );
            }
            return;
          }
          if (
            event.target.closest(
              '[data-app-composer-role="secondary"]',
            ) === null
          ) {
            return;
          }
          const focusedChildThreadId =
            focusedSecondaryComposerThreadId(threadId);
          if (focusedChildThreadId === null) return;
          const focusedSideChat = readSideChatPanelSnapshot(
            window.localStorage,
            threadId,
          ).sideChats.find(
            ({ childThreadId }) => childThreadId === focusedChildThreadId,
          );
          if (focusedSideChat !== undefined) {
            rememberRecentSideChatTabId(
              window.localStorage,
              threadId,
              focusedSideChat.id,
            );
          }
        },
        { capture: true, signal },
      );

      window.addEventListener(
        "keydown",
        (event) => {
          const target = newThreadTarget(
            event,
            window.location.pathname,
            readLastThreadProjectId(window.localStorage),
          );
          if (target !== null) {
            // Claim the chord everywhere so BB's native menu cannot reuse it.
            event.preventDefault();
            event.stopPropagation();
            // The React bridge exists wherever BB has mounted a composer.
            if (!hasOpenComposer()) return;
            openNewThread(newThreadHost, target.projectId);
            return;
          }

          const composerTarget = composerShortcutTarget(event);
          if (composerTarget === "primary") {
            const threadId = currentThreadId(window.location.pathname);
            if (!hasPrimaryComposer(threadId)) return;
            event.preventDefault();
            event.stopPropagation();
            focusPrimaryComposer(threadId);
            return;
          }
          if (composerTarget === "secondary") {
            const threadId = currentThreadId(window.location.pathname);
            if (threadId === null) return;

            event.preventDefault();
            event.stopPropagation();
            const panel = readSideChatPanelSnapshot(
              window.localStorage,
              threadId,
            );
            if (
              panel.isOpen &&
              panel.activeSideChat !== null &&
              isSecondaryComposerFocused(
                threadId,
                panel.activeSideChat.childThreadId,
              )
            ) {
              notifyPanelStateChanged(
                closePanel(window.localStorage, threadId),
              );
              focusPrimaryComposer(threadId);
              return;
            }

            const sideChat = selectSideChatPanelTab(
              panel,
              readRecentSideChatTabId(window.localStorage, threadId),
            );
            if (sideChat !== null) {
              const change = activateExistingSideChatPanel(
                window.localStorage,
                threadId,
                sideChat.id,
              );
              if (change !== null) {
                rememberRecentSideChatTabId(
                  window.localStorage,
                  threadId,
                  sideChat.id,
                );
                notifyPanelStateChanged(change);
                focusSideChatComposer(
                  signal,
                  threadId,
                  sideChat.childThreadId,
                );
                return;
              }
            }
            if (sideChatInFlight) return;

            sideChatInFlight = true;
            void createSideChat(pluginId, threadId)
              .then(({ threadId: childThreadId }) => {
                const tab = createSideChatPanelTab(threadId, childThreadId);
                rememberRecentSideChatTabId(
                  window.localStorage,
                  threadId,
                  tab.id,
                );
                notifyPanelStateChanged(
                  activateSideChatPanel(
                    window.localStorage,
                    threadId,
                    tab,
                  ),
                );
                focusSideChatComposer(signal, threadId, childThreadId);
              })
              .catch((error: unknown) => {
                toast.error(
                  rpcErrorMessage(error, "Failed to start side chat"),
                );
              })
              .finally(() => {
                sideChatInFlight = false;
              });
            return;
          }

          if (isTerminalShortcut(event)) {
            const threadId = currentThreadId(window.location.pathname);
            if (threadId === null) return;

            event.preventDefault();
            event.stopPropagation();
            const panel = readTerminalPanelSnapshot(
              window.localStorage,
              threadId,
            );
            if (shouldCloseTerminalPanel(panel, isTerminalFocused())) {
              notifyPanelStateChanged(
                closePanel(window.localStorage, threadId),
              );
              focusPrimaryComposer(threadId);
              return;
            }
            if (terminalInFlight) return;

            const rememberedTerminalId = readRecentTerminalId(
              window.localStorage,
              threadId,
            );
            const preferredTerminalId =
              panel.activeTerminalId ??
              (rememberedTerminalId !== null &&
                panel.terminalIds.includes(rememberedTerminalId)
                ? rememberedTerminalId
                : null);
            terminalInFlight = true;
            void openTerminal(pluginId, threadId, preferredTerminalId)
              .then(({ terminalId }) => {
                rememberRecentTerminalId(
                  window.localStorage,
                  threadId,
                  terminalId,
                );
                notifyPanelStateChanged(
                  activateTerminalPanel(
                    window.localStorage,
                    threadId,
                    terminalId,
                  ),
                );
                focusTerminal(signal, threadId);
              })
              .catch((error: unknown) => {
                toast.error(rpcErrorMessage(error, "Failed to open terminal"));
              })
              .finally(() => {
                terminalInFlight = false;
              });
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
              toast.error(rpcErrorMessage(error, "Failed to archive thread"));
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
