// bb-plugin-runtime-shim:@bb/plugin-sdk/app
var runtime = globalThis.__bbPluginRuntime;
if (runtime == null || runtime.pluginSdkApp == null) {
  throw new Error('Cannot load "@bb/plugin-sdk/app": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod = runtime.pluginSdkApp;
var {
  Markdown,
  ThreadChat,
  definePluginApp,
  experimental_NewThreadComposer,
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreadPullRequest,
  experimental_useSidebarThreadSplit,
  experimental_useSidebarThreads,
  useBbContext,
  useBbNavigate,
  useComposer,
  useComposerView,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
  useSettings
} = mod;

// bb-plugin-runtime-shim:react
var runtime2 = globalThis.__bbPluginRuntime;
if (runtime2 == null || runtime2.react == null) {
  throw new Error('Cannot load "react": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod2 = runtime2.react;
var {
  Activity,
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  act,
  cache,
  cacheSignal,
  captureOwnerStack,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  unstable_useCacheRefresh,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version
} = mod2;

// bb-plugin-runtime-shim:sonner
var runtime3 = globalThis.__bbPluginRuntime;
if (runtime3 == null || runtime3.sonner == null) {
  throw new Error('Cannot load "sonner": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod3 = runtime3.sonner;
var {
  Toaster,
  toast,
  useSonner
} = mod3;

// panel-tab-selection.ts
function selectPanelTabWhenReady({
  createObserver,
  icon,
  index,
  isCurrent,
  root,
  signal
}) {
  if (signal.aborted) return () => {
  };
  let stopped = false;
  let observer = null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    signal.removeEventListener("abort", stop);
  };
  const attempt = () => {
    if (stopped) return;
    if (!isCurrent()) {
      stop();
      return;
    }
    const targetIndex = index();
    if (targetIndex < 0) return;
    const tab = root.panelTabButtons().filter((button) => button.hasIcon(icon))[targetIndex];
    if (tab === void 0) return;
    tab.click();
    stop();
  };
  observer = createObserver(attempt);
  signal.addEventListener("abort", stop, { once: true });
  observer.observe();
  attempt();
  return stop;
}

// composer-navigation-bridge.ts
var primaryComposersByThread = /* @__PURE__ */ new Map();
var secondaryComposersByParent = /* @__PURE__ */ new Map();
var secondaryComposerReadyListeners = /* @__PURE__ */ new Map();
function registerPrimaryComposerFocus(threadId, focusComposer, panelTabHost) {
  const registrations = primaryComposersByThread.get(threadId) ?? [];
  const registration = { focus: focusComposer, panelTabHost };
  registrations.push(registration);
  primaryComposersByThread.set(threadId, registrations);
  return () => {
    const index = registrations.lastIndexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
    if (registrations.length === 0 && primaryComposersByThread.get(threadId) === registrations) {
      primaryComposersByThread.delete(threadId);
    }
  };
}
function hasPrimaryComposer(threadId) {
  return (primaryComposersByThread.get(threadId)?.length ?? 0) > 0;
}
function focusPrimaryComposer(threadId) {
  const registration = primaryComposersByThread.get(threadId)?.at(-1);
  if (registration === void 0) return false;
  registration.focus();
  return true;
}
function selectPrimaryPanelTabWhenReady(threadId, options) {
  const panelTabHost = primaryComposersByThread.get(threadId)?.at(-1)?.panelTabHost;
  if (panelTabHost === void 0) return () => {
  };
  return selectPanelTabWhenReady({ ...panelTabHost, ...options });
}
function registerSecondaryComposer(parentThreadId, childThreadId, registration) {
  let byChild = secondaryComposersByParent.get(parentThreadId);
  if (byChild === void 0) {
    byChild = /* @__PURE__ */ new Map();
    secondaryComposersByParent.set(parentThreadId, byChild);
  }
  const registrations = byChild.get(childThreadId) ?? [];
  registrations.push(registration);
  byChild.set(childThreadId, registrations);
  for (const listener of secondaryComposerReadyListeners.get(parentThreadId)?.get(childThreadId) ?? []) {
    listener();
  }
  return () => {
    const index = registrations.lastIndexOf(registration);
    if (index !== -1) registrations.splice(index, 1);
    if (registrations.length === 0) byChild?.delete(childThreadId);
    if (byChild?.size === 0) secondaryComposersByParent.delete(parentThreadId);
  };
}
function focusSecondaryComposer(parentThreadId, childThreadId) {
  const registrations = secondaryComposersByParent.get(parentThreadId)?.get(childThreadId);
  if (registrations === void 0) return false;
  for (let index = registrations.length - 1; index >= 0; index -= 1) {
    const registration = registrations[index];
    if (registration?.isVisible()) {
      registration.focus();
      return registration.isFocused();
    }
  }
  return false;
}
function focusSecondaryComposerWhenReady(parentThreadId, childThreadId, { isCurrent, signal }) {
  if (signal.aborted) return () => {
  };
  let byChild = secondaryComposerReadyListeners.get(parentThreadId);
  if (byChild === void 0) {
    byChild = /* @__PURE__ */ new Map();
    secondaryComposerReadyListeners.set(parentThreadId, byChild);
  }
  const listeners = byChild.get(childThreadId) ?? /* @__PURE__ */ new Set();
  byChild.set(childThreadId, listeners);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    listeners.delete(attempt);
    if (listeners.size === 0) byChild?.delete(childThreadId);
    if (byChild?.size === 0) {
      secondaryComposerReadyListeners.delete(parentThreadId);
    }
    signal.removeEventListener("abort", stop);
  };
  const attempt = () => {
    if (stopped) return;
    if (!isCurrent() || focusSecondaryComposer(parentThreadId, childThreadId)) {
      stop();
    }
  };
  listeners.add(attempt);
  signal.addEventListener("abort", stop, { once: true });
  attempt();
  return stop;
}
function isSecondaryComposerFocused(parentThreadId, childThreadId) {
  return secondaryComposersByParent.get(parentThreadId)?.get(childThreadId)?.some(({ isFocused }) => isFocused()) ?? false;
}
function focusedSecondaryComposerThreadId(parentThreadId) {
  const byChild = secondaryComposersByParent.get(parentThreadId);
  if (byChild === void 0) return null;
  for (const [childThreadId, registrations] of byChild) {
    if (registrations.some(({ isFocused }) => isFocused())) {
      return childThreadId;
    }
  }
  return null;
}

// last-thread-project.ts
var PERSONAL_PROJECT_ID = "proj_personal";
var LAST_THREAD_PROJECT_ID_STORAGE_KEY = "bb.missing-keyboard-shortcuts.last-thread-project-id";
function rememberThreadProject(storage, context) {
  if (context.threadId === null) return;
  storage.setItem(
    LAST_THREAD_PROJECT_ID_STORAGE_KEY,
    context.projectId ?? PERSONAL_PROJECT_ID
  );
}
function readLastThreadProjectId(storage) {
  const projectId = storage.getItem(LAST_THREAD_PROJECT_ID_STORAGE_KEY);
  return projectId && projectId.length > 0 ? projectId : null;
}

// shortcut-actions.ts
function exactCommandChord(event) {
  return event.metaKey && !event.altKey && !event.ctrlKey && !event.repeat;
}
function historyDirection(event) {
  if (!exactCommandChord(event) || event.shiftKey) {
    return null;
  }
  if (event.key === "[") return -1;
  if (event.key === "]") return 1;
  return null;
}
function isTerminalShortcut(event) {
  return event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && !event.repeat && event.key === "`";
}
function composerShortcutTarget(event) {
  if (!exactCommandChord(event) || event.key.toLowerCase() !== "l") {
    return null;
  }
  return event.shiftKey ? "secondary" : "primary";
}
function newThreadTarget(event, pathname, lastThreadProjectId = null) {
  if (!exactCommandChord(event) || event.key.toLowerCase() !== "n") {
    return null;
  }
  if (!event.shiftKey) {
    return { projectId: PERSONAL_PROJECT_ID };
  }
  const route = currentThreadRoute(pathname);
  if (route === null) {
    return { projectId: lastThreadProjectId ?? PERSONAL_PROJECT_ID };
  }
  if (route.projectId === null) {
    return { projectId: PERSONAL_PROJECT_ID };
  }
  return { projectId: route.projectId };
}
function decodePathSegment(segment) {
  if (!segment) return null;
  try {
    return decodeURIComponent(segment) || null;
  } catch {
    return null;
  }
}
function currentThreadRoute(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "threads") {
    const threadId = decodePathSegment(segments[1]);
    return threadId === null ? null : { projectId: null, threadId };
  }
  if (segments.length === 4 && segments[0] === "projects" && segments[2] === "threads") {
    const projectId = decodePathSegment(segments[1]);
    const threadId = decodePathSegment(segments[3]);
    return projectId === null || threadId === null ? null : { projectId, threadId };
  }
  return null;
}
function currentThreadId(pathname) {
  return currentThreadRoute(pathname)?.threadId ?? null;
}

// new-thread-navigation.ts
function openNewThread(host, projectId) {
  const oldProjectId = host.getSelectedProjectId();
  host.selectProject(projectId);
  host.notifyProjectChanged(oldProjectId, projectId);
  host.openComposer();
}

// native-command-delegation.ts
var DEFAULT_THREAD_NEW_SHORTCUT = {
  alt: false,
  control: false,
  key: "o",
  meta: false,
  mod: true,
  shift: true
};
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isShortcut(value) {
  return isRecord(value) && typeof value.alt === "boolean" && typeof value.control === "boolean" && typeof value.key === "string" && value.key.length > 0 && typeof value.meta === "boolean" && typeof value.mod === "boolean" && typeof value.shift === "boolean";
}
function parseConfig(value) {
  if (!isRecord(value) || !Array.isArray(value.keybindings)) return null;
  const keybindings = value.keybindings.flatMap((binding) => {
    if (!isRecord(binding) || typeof binding.command !== "string" || typeof binding.desktopOnly !== "boolean" || !isShortcut(binding.shortcut)) {
      return [];
    }
    return [
      {
        command: binding.command,
        desktopOnly: binding.desktopOnly,
        shortcut: binding.shortcut
      }
    ];
  });
  return { keybindings };
}
function keyboardCode(key) {
  if (/^[a-z]$/iu.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/u.test(key)) return `Digit${key}`;
  return key;
}
function createNativeCommandDelegate({
  command,
  createEvent,
  fetchConfig,
  isMac,
  target
}) {
  const delegatedEvents = /* @__PURE__ */ new WeakSet();
  let shortcutPromise = null;
  const loadShortcut = () => {
    shortcutPromise ??= fetchConfig().then((value) => {
      const config = parseConfig(value);
      return config?.keybindings.filter(
        (binding) => binding.command === command && !binding.desktopOnly
      ).at(-1)?.shortcut ?? DEFAULT_THREAD_NEW_SHORTCUT;
    }).catch(() => DEFAULT_THREAD_NEW_SHORTCUT);
    return shortcutPromise;
  };
  return {
    async dispatch() {
      const shortcut = await loadShortcut();
      const event = createEvent("keydown", {
        altKey: shortcut.alt,
        bubbles: true,
        cancelable: true,
        code: keyboardCode(shortcut.key),
        composed: true,
        ctrlKey: shortcut.control || shortcut.mod && !isMac,
        key: shortcut.key,
        metaKey: shortcut.meta || shortcut.mod && isMac,
        shiftKey: shortcut.shift
      });
      delegatedEvents.add(event);
      target.dispatchEvent(event);
    },
    isDelegatedEvent(event) {
      return delegatedEvents.has(event);
    },
    prefetch() {
      return loadShortcut().then(() => void 0);
    }
  };
}

// native-command-hints.ts
function notifyNativeShortcutHandled(target, createEvent) {
  target.dispatchEvent(
    createEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Unidentified",
      key: "Unidentified"
    })
  );
}

// terminal-panel-state.ts
var FIXED_PANEL_STORAGE_PREFIX = "bb.thread.fixedPanelTabsState";
var FIXED_PANEL_STORAGE_VERSION = 1;
var RECENT_TERMINAL_STORAGE_PREFIX = "bb.plugin.missing-keyboard-shortcuts.recent-terminal";
var RECENT_SIDE_CHAT_STORAGE_PREFIX = "bb.plugin.missing-keyboard-shortcuts.recent-side-chat";
var SIDE_CHAT_PLUGIN_ID = "side-chat";
var SIDE_CHAT_ACTION_ID = "side-chat";
var SIDE_CHAT_TITLE = "Side chat";
function shouldCloseTerminalPanel(panel, terminalFocused) {
  return panel.isOpen && panel.activeTerminalId !== null && terminalFocused;
}
function panelStorageKey(threadId) {
  return `${FIXED_PANEL_STORAGE_PREFIX}-${encodeURIComponent(threadId.trim())}-${FIXED_PANEL_STORAGE_VERSION}`;
}
function recentTerminalStorageKey(threadId) {
  return `${RECENT_TERMINAL_STORAGE_PREFIX}-${encodeURIComponent(threadId.trim())}`;
}
function recentSideChatStorageKey(threadId) {
  return `${RECENT_SIDE_CHAT_STORAGE_PREFIX}-${encodeURIComponent(threadId.trim())}`;
}
function terminalTabId(terminalId) {
  return `terminal:${encodeURIComponent(terminalId)}:none`;
}
function pluginPanelTabId(pluginId, actionId, paramsJson) {
  return `plugin-panel:${encodeURIComponent(`${pluginId}:${actionId}:${paramsJson}`)}:none`;
}
function isRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parsePanelState(value) {
  if (value !== null) {
    try {
      const parsed = JSON.parse(value);
      if (isRecord2(parsed) && parsed.version === FIXED_PANEL_STORAGE_VERSION && typeof parsed.lastUsedAt === "number" && Number.isInteger(parsed.lastUsedAt) && parsed.lastUsedAt >= 0 && isRecord2(parsed.secondary) && Array.isArray(parsed.secondary.tabs) && parsed.secondary.tabs.every(isRecord2) && (typeof parsed.secondary.activeTabId === "string" || parsed.secondary.activeTabId === null) && typeof parsed.secondary.isOpen === "boolean") {
        return parsed;
      }
    } catch {
    }
  }
  return {
    version: FIXED_PANEL_STORAGE_VERSION,
    secondary: { tabs: [], activeTabId: null, isOpen: false },
    lastUsedAt: 0
  };
}
function terminalIdForTab(tab) {
  return tab.kind === "terminal" && typeof tab.terminalId === "string" ? tab.terminalId : null;
}
function sideChatForTab(tab, parentThreadId) {
  if (tab.kind !== "plugin-panel" || tab.pluginId !== SIDE_CHAT_PLUGIN_ID || tab.actionId !== SIDE_CHAT_ACTION_ID || typeof tab.id !== "string" || typeof tab.paramsJson !== "string") {
    return null;
  }
  try {
    const params = JSON.parse(tab.paramsJson);
    if (!isRecord2(params) || typeof params.threadId !== "string" || params.threadId.length === 0 || params.sourceThreadId !== parentThreadId) {
      return null;
    }
    return { childThreadId: params.threadId, id: tab.id };
  } catch {
    return null;
  }
}
function snapshotFromState(state) {
  const terminalIds = state.secondary.tabs.flatMap((tab) => {
    const terminalId = terminalIdForTab(tab);
    return terminalId === null ? [] : [terminalId];
  });
  const activeTab = state.secondary.tabs.find(
    (tab) => tab.id === state.secondary.activeTabId
  );
  return {
    activeTerminalId: activeTab === void 0 ? null : terminalIdForTab(activeTab),
    isOpen: state.secondary.isOpen,
    terminalIds
  };
}
function writePanelState(storage, threadId, state) {
  const key = panelStorageKey(threadId);
  const oldValue = storage.getItem(key);
  const newValue = JSON.stringify(state);
  storage.setItem(key, newValue);
  return { key, newValue, oldValue };
}
function readTerminalPanelSnapshot(storage, threadId) {
  return snapshotFromState(
    parsePanelState(storage.getItem(panelStorageKey(threadId)))
  );
}
function readSideChatPanelSnapshot(storage, threadId) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  const sideChats = state.secondary.tabs.flatMap((tab) => {
    const sideChat = sideChatForTab(tab, threadId);
    return sideChat === null ? [] : [sideChat];
  });
  const activeSideChat = sideChats.find(({ id }) => id === state.secondary.activeTabId) ?? null;
  return { activeSideChat, isOpen: state.secondary.isOpen, sideChats };
}
function createSideChatPanelTab(parentThreadId, childThreadId) {
  const paramsJson = JSON.stringify({
    threadId: childThreadId,
    sourceThreadId: parentThreadId,
    sourceMessageText: "",
    sourceSeqEnd: null
  });
  return {
    actionId: SIDE_CHAT_ACTION_ID,
    childThreadId,
    id: pluginPanelTabId(
      SIDE_CHAT_PLUGIN_ID,
      SIDE_CHAT_ACTION_ID,
      paramsJson
    ),
    kind: "plugin-panel",
    paramsJson,
    pluginId: SIDE_CHAT_PLUGIN_ID,
    title: SIDE_CHAT_TITLE
  };
}
function activateSideChatPanel(storage, threadId, tab, now = Date.now()) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  const storedTab = {
    actionId: tab.actionId,
    id: tab.id,
    kind: tab.kind,
    paramsJson: tab.paramsJson,
    pluginId: tab.pluginId,
    title: tab.title
  };
  const tabs = state.secondary.tabs.some(({ id }) => id === tab.id) ? state.secondary.tabs : [...state.secondary.tabs, storedTab];
  return writePanelState(storage, threadId, {
    ...state,
    secondary: {
      ...state.secondary,
      tabs,
      activeTabId: tab.id,
      isOpen: true
    },
    lastUsedAt: now
  });
}
function activateExistingSideChatPanel(storage, threadId, tabId, now = Date.now()) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  const tab = state.secondary.tabs.find(({ id }) => id === tabId);
  if (tab === void 0 || sideChatForTab(tab, threadId) === null) return null;
  return writePanelState(storage, threadId, {
    ...state,
    secondary: {
      ...state.secondary,
      activeTabId: tabId,
      isOpen: true
    },
    lastUsedAt: now
  });
}
function removeSideChatPanelTab(storage, threadId, tabId, now = Date.now()) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  const tab = state.secondary.tabs.find(({ id }) => id === tabId);
  if (tab === void 0 || sideChatForTab(tab, threadId) === null) return null;
  return writePanelState(storage, threadId, {
    ...state,
    secondary: {
      ...state.secondary,
      tabs: state.secondary.tabs.filter(({ id }) => id !== tabId),
      activeTabId: state.secondary.activeTabId === tabId ? null : state.secondary.activeTabId
    },
    lastUsedAt: now
  });
}
function selectSideChatPanelTab(panel, recentTabId) {
  return panel.activeSideChat ?? panel.sideChats.find(({ id }) => id === recentTabId) ?? panel.sideChats.at(-1) ?? null;
}
function activateTerminalPanel(storage, threadId, terminalId, now = Date.now()) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  const id = terminalTabId(terminalId);
  const tabs = state.secondary.tabs.some((tab) => tab.id === id) ? state.secondary.tabs : [...state.secondary.tabs, { id, kind: "terminal", terminalId }];
  return writePanelState(storage, threadId, {
    ...state,
    secondary: {
      ...state.secondary,
      tabs,
      activeTabId: id,
      isOpen: true
    },
    lastUsedAt: now
  });
}
function closePanel(storage, threadId, now = Date.now()) {
  const state = parsePanelState(storage.getItem(panelStorageKey(threadId)));
  return writePanelState(storage, threadId, {
    ...state,
    secondary: { ...state.secondary, isOpen: false },
    lastUsedAt: now
  });
}
function readRecentSideChatTabId(storage, threadId) {
  return storage.getItem(recentSideChatStorageKey(threadId));
}
function rememberRecentSideChatTabId(storage, threadId, tabId) {
  storage.setItem(recentSideChatStorageKey(threadId), tabId);
}
function readRecentTerminalId(storage, threadId) {
  return storage.getItem(recentTerminalStorageKey(threadId));
}
function rememberRecentTerminalId(storage, threadId, terminalId) {
  storage.setItem(recentTerminalStorageKey(threadId), terminalId);
}

// app.tsx
var ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY = "bb.root-compose.project-id";
function rpcErrorMessage(error, fallback) {
  if (typeof error === "string") return error;
  if (error !== null && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
function ComposerNavigationBridge() {
  const context = useBbContext();
  const composer = useComposer();
  const view = useComposerView();
  const markerRef = useRef(null);
  const composerThreadId = view.scope.kind === "thread" ? view.scope.threadId : null;
  useEffect(() => {
    rememberThreadProject(window.localStorage, context);
  }, [context.projectId, context.threadId]);
  useLayoutEffect(() => {
    const marker = markerRef.current;
    const composerElement = marker?.closest(
      "[data-app-composer-role]"
    );
    const role = composerElement?.getAttribute("data-app-composer-role");
    if (role === "primary") {
      if (view.scope.kind === "thread") {
        const panelRoot = composerElement?.closest(
          "[data-panel-group]"
        );
        return registerPrimaryComposerFocus(
          view.scope.threadId,
          composer.focus,
          panelRoot === null || panelRoot === void 0 ? void 0 : {
            createObserver(callback) {
              const observer = new MutationObserver(callback);
              return {
                disconnect: () => observer.disconnect(),
                observe: () => observer.observe(panelRoot, {
                  childList: true,
                  subtree: true
                })
              };
            },
            root: {
              panelTabButtons: () => Array.from(
                panelRoot.querySelectorAll(
                  '[data-testid="secondary-panel-tab-strip"] button:not([data-tab-pill-close])'
                ),
                (button) => ({
                  click: () => button.click(),
                  hasIcon: (icon) => button.querySelector(`[data-icon="${icon}"]`) !== null
                })
              )
            }
          }
        );
      }
      if (view.scope.kind === "new-thread") {
        return registerPrimaryComposerFocus(null, composer.focus);
      }
      return;
    }
    if (role !== "secondary" || context.threadId === null || composerThreadId === null || composerThreadId === context.threadId || composerElement === null || composerElement === void 0) {
      return;
    }
    return registerSecondaryComposer(context.threadId, composerThreadId, {
      focus: composer.focus,
      isFocused: () => composerElement.contains(document.activeElement),
      isVisible: () => {
        const bounds = composerElement.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0;
      }
    });
  }, [composer.focus, composerThreadId, context.threadId, view.scope.kind]);
  return createElement("span", { hidden: true, ref: markerRef });
}
async function openTerminal(pluginId, threadId, preferredTerminalId) {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/openTerminal`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredTerminalId, threadId }),
      credentials: "same-origin"
    }
  );
  const envelope = await response.json();
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok ? rpcErrorMessage(envelope.error, "Failed to open terminal") : `Terminal request failed (${response.status})`
    );
  }
  return envelope.result;
}
async function createSideChat(pluginId, threadId) {
  const response = await fetch(
    "/api/v1/plugins/side-chat/rpc/createSideChat",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceThreadId: threadId,
        anchorText: ""
      }),
      credentials: "same-origin"
    }
  );
  const envelope = await response.json();
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok ? rpcErrorMessage(envelope.error, "Failed to start side chat") : `Side-chat request failed (${response.status})`
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
        parentThreadId: threadId
      }),
      credentials: "same-origin"
    }
  );
  const persistEnvelope = await persistResponse.json();
  if (!persistResponse.ok || !persistEnvelope.ok) {
    throw new Error(
      !persistEnvelope.ok ? rpcErrorMessage(persistEnvelope.error, "Failed to persist side chat") : `Side-chat tab request failed (${persistResponse.status})`
    );
  }
  return result;
}
async function validateSideChat(pluginId, parentThreadId, sideChat) {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/validateSideChat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        childThreadId: sideChat.childThreadId,
        parentThreadId,
        tabId: sideChat.id
      }),
      credentials: "same-origin"
    }
  );
  const envelope = await response.json();
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok ? rpcErrorMessage(envelope.error, "Failed to validate side chat") : `Side-chat validation failed (${response.status})`
    );
  }
  return envelope.result;
}
function notifyPanelStateChanged(change) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: change.key,
      newValue: change.newValue,
      oldValue: change.oldValue,
      storageArea: window.localStorage,
      url: window.location.href
    })
  );
}
function isTerminalFocused() {
  return document.activeElement instanceof Element && document.activeElement.closest("[data-app-terminal]") !== null;
}
function activateAndFocusTerminal(signal, threadId, terminalId) {
  if (currentThreadId(window.location.pathname) !== threadId) return () => {
  };
  const panel = readTerminalPanelSnapshot(window.localStorage, threadId);
  if (!panel.isOpen || panel.activeTerminalId !== terminalId) {
    notifyPanelStateChanged(
      activateTerminalPanel(window.localStorage, threadId, terminalId)
    );
    return selectPrimaryPanelTabWhenReady(threadId, {
      icon: "Terminal",
      index: () => readTerminalPanelSnapshot(
        window.localStorage,
        threadId
      ).terminalIds.indexOf(terminalId),
      isCurrent: () => currentThreadId(window.location.pathname) === threadId,
      signal
    });
  }
  const visibleTerminal = Array.from(
    document.querySelectorAll("[data-app-terminal]")
  ).find((terminal) => {
    const bounds = terminal.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
  visibleTerminal?.querySelector(".xterm-helper-textarea, textarea")?.focus({ preventScroll: true });
  return () => {
  };
}
function focusSideChatComposer(signal, parentThreadId, childThreadId, tab) {
  if (currentThreadId(window.location.pathname) !== parentThreadId) {
    return () => {
    };
  }
  const panel = readSideChatPanelSnapshot(
    window.localStorage,
    parentThreadId
  );
  if (!panel.isOpen || panel.activeSideChat?.childThreadId !== childThreadId) {
    const existingTabId = panel.sideChats.find(
      (sideChat) => sideChat.childThreadId === childThreadId
    )?.id;
    const change = tab === null ? activateExistingSideChatPanel(
      window.localStorage,
      parentThreadId,
      existingTabId ?? ""
    ) : activateSideChatPanel(window.localStorage, parentThreadId, tab);
    if (change !== null) notifyPanelStateChanged(change);
  }
  const stopSelectingTab = selectPrimaryPanelTabWhenReady(parentThreadId, {
    icon: "SideChat",
    index: () => readSideChatPanelSnapshot(window.localStorage, parentThreadId).sideChats.findIndex(({ childThreadId: candidate }) => candidate === childThreadId),
    isCurrent: () => currentThreadId(window.location.pathname) === parentThreadId,
    signal
  });
  const stopFocusingComposer = focusSecondaryComposerWhenReady(
    parentThreadId,
    childThreadId,
    {
      isCurrent: () => {
        if (currentThreadId(window.location.pathname) !== parentThreadId) {
          return false;
        }
        const currentPanel = readSideChatPanelSnapshot(
          window.localStorage,
          parentThreadId
        );
        return currentPanel.isOpen && currentPanel.activeSideChat?.childThreadId === childThreadId;
      },
      signal
    }
  );
  return () => {
    stopSelectingTab();
    stopFocusingComposer();
  };
}
var app_default = definePluginApp((app) => {
  app.composer.customize({
    id: "navigation-bridge",
    banners: [
      {
        id: "navigation-bridge",
        chrome: "bare",
        component: ComposerNavigationBridge
      }
    ]
  });
  app.contentScripts.register({
    id: "missing-keyboard-shortcuts",
    mount({ pluginId, signal }) {
      const sideChatInFlightThreads = /* @__PURE__ */ new Set();
      const terminalInFlightThreads = /* @__PURE__ */ new Set();
      const pendingSideChatActions = /* @__PURE__ */ new Map();
      const pendingTerminalActions = /* @__PURE__ */ new Map();
      const stopPendingAction = (actions, threadId) => {
        actions.get(threadId)?.();
        actions.delete(threadId);
      };
      signal.addEventListener(
        "abort",
        () => {
          for (const stop of pendingSideChatActions.values()) stop();
          pendingSideChatActions.clear();
          for (const stop of pendingTerminalActions.values()) stop();
          pendingTerminalActions.clear();
        },
        { once: true }
      );
      const createKeyboardEvent = (type, init) => new KeyboardEvent(type, init);
      const nativeThreadNewCommand = createNativeCommandDelegate({
        command: "thread.new",
        createEvent: createKeyboardEvent,
        async fetchConfig() {
          const response = await fetch("/api/v1/system/config", {
            credentials: "same-origin"
          });
          if (!response.ok) {
            throw new Error(`System config request failed (${response.status})`);
          }
          return response.json();
        },
        isMac: /Mac|iPhone|iPad|iPod/u.test(navigator.platform),
        target: window
      });
      void nativeThreadNewCommand.prefetch();
      const newThreadHost = {
        getSelectedProjectId() {
          return window.localStorage.getItem(
            ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY
          );
        },
        selectProject(projectId) {
          window.localStorage.setItem(
            ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
            projectId
          );
        },
        notifyProjectChanged(oldProjectId, newProjectId) {
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: ROOT_COMPOSE_PROJECT_ID_STORAGE_KEY,
              newValue: newProjectId,
              oldValue: oldProjectId,
              storageArea: window.localStorage,
              url: window.location.href
            })
          );
        },
        openComposer() {
          void nativeThreadNewCommand.dispatch();
        }
      };
      const focusExistingSideChat = (parentThreadId, childThreadId) => {
        if (currentThreadId(window.location.pathname) !== parentThreadId) return;
        stopPendingAction(pendingSideChatActions, parentThreadId);
        pendingSideChatActions.set(
          parentThreadId,
          focusSideChatComposer(
            signal,
            parentThreadId,
            childThreadId,
            null
          )
        );
      };
      const createAndFocusSideChat = async (parentThreadId) => {
        const { threadId: childThreadId } = await createSideChat(
          pluginId,
          parentThreadId
        );
        if (currentThreadId(window.location.pathname) !== parentThreadId) return;
        const tab = createSideChatPanelTab(parentThreadId, childThreadId);
        rememberRecentSideChatTabId(
          window.localStorage,
          parentThreadId,
          tab.id
        );
        stopPendingAction(pendingSideChatActions, parentThreadId);
        pendingSideChatActions.set(
          parentThreadId,
          focusSideChatComposer(
            signal,
            parentThreadId,
            childThreadId,
            tab
          )
        );
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
              threadId
            );
            if (activeTerminalId !== null) {
              rememberRecentTerminalId(
                window.localStorage,
                threadId,
                activeTerminalId
              );
            }
            return;
          }
          if (event.target.closest(
            '[data-app-composer-role="secondary"]'
          ) === null) {
            return;
          }
          const focusedChildThreadId = focusedSecondaryComposerThreadId(threadId);
          if (focusedChildThreadId === null) return;
          const focusedSideChat = readSideChatPanelSnapshot(
            window.localStorage,
            threadId
          ).sideChats.find(
            ({ childThreadId }) => childThreadId === focusedChildThreadId
          );
          if (focusedSideChat !== void 0) {
            rememberRecentSideChatTabId(
              window.localStorage,
              threadId,
              focusedSideChat.id
            );
          }
        },
        { capture: true, signal }
      );
      window.addEventListener(
        "keydown",
        (event) => {
          if (nativeThreadNewCommand.isDelegatedEvent(event)) return;
          const target = newThreadTarget(
            event,
            window.location.pathname,
            readLastThreadProjectId(window.localStorage)
          );
          if (target !== null) {
            event.preventDefault();
            event.stopPropagation();
            openNewThread(newThreadHost, target.projectId);
            return;
          }
          const composerTarget = composerShortcutTarget(event);
          if (composerTarget === "primary") {
            const threadId = currentThreadId(window.location.pathname);
            if (!hasPrimaryComposer(threadId)) return;
            event.preventDefault();
            event.stopPropagation();
            notifyNativeShortcutHandled(window, createKeyboardEvent);
            focusPrimaryComposer(threadId);
            return;
          }
          if (composerTarget === "secondary") {
            const threadId = currentThreadId(window.location.pathname);
            if (threadId === null) return;
            event.preventDefault();
            event.stopPropagation();
            notifyNativeShortcutHandled(window, createKeyboardEvent);
            stopPendingAction(pendingSideChatActions, threadId);
            const panel = readSideChatPanelSnapshot(
              window.localStorage,
              threadId
            );
            if (panel.isOpen && panel.activeSideChat !== null && isSecondaryComposerFocused(
              threadId,
              panel.activeSideChat.childThreadId
            )) {
              notifyPanelStateChanged(
                closePanel(window.localStorage, threadId)
              );
              focusPrimaryComposer(threadId);
              return;
            }
            const sideChat = selectSideChatPanelTab(
              panel,
              readRecentSideChatTabId(window.localStorage, threadId)
            );
            if (sideChatInFlightThreads.has(threadId)) return;
            sideChatInFlightThreads.add(threadId);
            void (async () => {
              if (sideChat === null) {
                await createAndFocusSideChat(threadId);
                return;
              }
              const { reusable } = await validateSideChat(
                pluginId,
                threadId,
                sideChat
              );
              if (reusable) {
                rememberRecentSideChatTabId(
                  window.localStorage,
                  threadId,
                  sideChat.id
                );
                focusExistingSideChat(threadId, sideChat.childThreadId);
                return;
              }
              const change = removeSideChatPanelTab(
                window.localStorage,
                threadId,
                sideChat.id
              );
              if (change !== null) notifyPanelStateChanged(change);
              await createAndFocusSideChat(threadId);
            })().catch((error) => {
              toast.error(
                rpcErrorMessage(error, "Failed to start side chat")
              );
            }).finally(() => {
              sideChatInFlightThreads.delete(threadId);
            });
            return;
          }
          if (isTerminalShortcut(event)) {
            const threadId = currentThreadId(window.location.pathname);
            if (threadId === null) return;
            event.preventDefault();
            event.stopPropagation();
            notifyNativeShortcutHandled(window, createKeyboardEvent);
            stopPendingAction(pendingTerminalActions, threadId);
            const panel = readTerminalPanelSnapshot(
              window.localStorage,
              threadId
            );
            if (shouldCloseTerminalPanel(panel, isTerminalFocused())) {
              notifyPanelStateChanged(
                closePanel(window.localStorage, threadId)
              );
              focusPrimaryComposer(threadId);
              return;
            }
            if (terminalInFlightThreads.has(threadId)) return;
            const rememberedTerminalId = readRecentTerminalId(
              window.localStorage,
              threadId
            );
            const preferredTerminalId = panel.activeTerminalId ?? (rememberedTerminalId !== null && panel.terminalIds.includes(rememberedTerminalId) ? rememberedTerminalId : null);
            terminalInFlightThreads.add(threadId);
            void openTerminal(pluginId, threadId, preferredTerminalId).then(({ terminalId }) => {
              rememberRecentTerminalId(
                window.localStorage,
                threadId,
                terminalId
              );
              pendingTerminalActions.set(
                threadId,
                activateAndFocusTerminal(signal, threadId, terminalId)
              );
            }).catch((error) => {
              toast.error(rpcErrorMessage(error, "Failed to open terminal"));
            }).finally(() => {
              terminalInFlightThreads.delete(threadId);
            });
            return;
          }
          const direction = historyDirection(event);
          if (direction === null) return;
          event.preventDefault();
          event.stopPropagation();
          notifyNativeShortcutHandled(window, createKeyboardEvent);
          window.history.go(direction);
        },
        { capture: true, signal }
      );
    }
  });
});
export {
  app_default as default
};
