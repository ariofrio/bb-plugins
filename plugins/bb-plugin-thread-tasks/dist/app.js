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

// thread-status.ts
var THREAD_STATUSES = [
  "Done",
  "To do",
  "Working",
  "Waiting",
  "Deferred",
  "Canceled"
];
var DEFAULT_THREAD_STATUS = "To do";
function statusKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
var STATUS_BY_KEY = new Map(
  THREAD_STATUSES.flatMap((status) => {
    const entries = [[statusKey(status), status]];
    if (status === "Canceled") entries.push(["cancelled", status]);
    return entries;
  })
);
function groupThreadsByStatus(threads, assignments) {
  const assignmentByThread = new Map(
    assignments.map((assignment) => [assignment.threadId, assignment])
  );
  const sourceIndex = new Map(threads.map((thread, index) => [thread.id, index]));
  const groups = {
    Done: [],
    "To do": [],
    Working: [],
    Waiting: [],
    Deferred: [],
    Canceled: []
  };
  for (const thread of threads) {
    const taskStatus = assignmentByThread.get(thread.id)?.taskStatus ?? DEFAULT_THREAD_STATUS;
    groups[taskStatus].push(thread);
  }
  for (const status of THREAD_STATUSES) {
    groups[status].sort((left, right) => {
      const leftAssignment = assignmentByThread.get(left.id);
      const rightAssignment = assignmentByThread.get(right.id);
      if (leftAssignment && rightAssignment) {
        if (leftAssignment.sortKey < rightAssignment.sortKey) return -1;
        if (leftAssignment.sortKey > rightAssignment.sortKey) return 1;
        return left.id.localeCompare(right.id);
      }
      if (leftAssignment) return -1;
      if (rightAssignment) return 1;
      return (sourceIndex.get(left.id) ?? 0) - (sourceIndex.get(right.id) ?? 0);
    });
  }
  return groups;
}
function destinationOrder(currentThreadIds, movingThreadId, beforeThreadId) {
  if (beforeThreadId === movingThreadId) return [...currentThreadIds];
  const withoutMoving = currentThreadIds.filter((id) => id !== movingThreadId);
  const insertionIndex = beforeThreadId === null ? -1 : withoutMoving.indexOf(beforeThreadId);
  const next = [...withoutMoving];
  next.splice(insertionIndex < 0 ? next.length : insertionIndex, 0, movingThreadId);
  return next;
}

// pinned-threads.ts
function buildPinnedThreadState(threads, pinnedThreadIds) {
  const byId = new Map(threads.map((item) => [item.id, item]));
  const childrenByParentId = /* @__PURE__ */ new Map();
  const explicitlyPinnedIds = new Set(
    threads.filter((item) => item.isPinned).map((item) => item.id)
  );
  for (const item of threads) {
    if (item.parentThreadId === null || item.parentThreadId === item.id) continue;
    const children = childrenByParentId.get(item.parentThreadId) ?? [];
    children.push(item);
    childrenByParentId.set(item.parentThreadId, children);
  }
  const effectivePinnedThreadIds = new Set(explicitlyPinnedIds);
  function includeDescendants(threadId, path) {
    if (path.has(threadId)) return;
    const nextPath = new Set(path);
    nextPath.add(threadId);
    for (const child of childrenByParentId.get(threadId) ?? []) {
      effectivePinnedThreadIds.add(child.id);
      includeDescendants(child.id, nextPath);
    }
  }
  for (const threadId of explicitlyPinnedIds) {
    includeDescendants(threadId, /* @__PURE__ */ new Set());
  }
  const orderedExplicitIds = [];
  const orderedExplicitIdSet = /* @__PURE__ */ new Set();
  for (const threadId of pinnedThreadIds) {
    if (!explicitlyPinnedIds.has(threadId) || orderedExplicitIdSet.has(threadId)) {
      continue;
    }
    orderedExplicitIds.push(threadId);
    orderedExplicitIdSet.add(threadId);
  }
  for (const item of threads) {
    if (!item.isPinned || orderedExplicitIdSet.has(item.id)) continue;
    orderedExplicitIds.push(item.id);
    orderedExplicitIdSet.add(item.id);
  }
  const rootIds = orderedExplicitIds.filter((threadId) => {
    const parentThreadId = byId.get(threadId)?.parentThreadId ?? null;
    return parentThreadId === null || !effectivePinnedThreadIds.has(parentThreadId);
  });
  const pinnedThreads = [];
  const visited = /* @__PURE__ */ new Set();
  function visit(threadId) {
    if (visited.has(threadId) || !effectivePinnedThreadIds.has(threadId)) return;
    const item = byId.get(threadId);
    if (!item) return;
    visited.add(threadId);
    pinnedThreads.push(item);
    for (const child of childrenByParentId.get(threadId) ?? []) visit(child.id);
  }
  for (const threadId of rootIds) visit(threadId);
  for (const item of threads) visit(item.id);
  return { effectivePinnedThreadIds, pinnedThreads };
}

// node_modules/@hugeicons/react/dist/esm/HugeiconsIcon.js
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none"
};
var HugeiconsIcon = forwardRef(({ color = "currentColor", size = 24, strokeWidth, absoluteStrokeWidth = false, className = "", altIcon, showAlt = false, icon, primaryColor, secondaryColor, disableSecondaryOpacity = false, ...rest }, ref) => {
  const calculatedStrokeWidth = strokeWidth !== void 0 ? absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth : void 0;
  const strokeProps = calculatedStrokeWidth !== void 0 ? {
    strokeWidth: calculatedStrokeWidth,
    stroke: "currentColor"
  } : {};
  const elementProps = {
    ref,
    ...defaultAttributes,
    width: size,
    height: size,
    color: primaryColor || color,
    className,
    ...strokeProps,
    ...rest
  };
  const currentIcon = showAlt && altIcon ? altIcon : icon;
  const svgChildren = [...currentIcon].sort(([, a], [, b]) => {
    const hasOpacityA = a.opacity !== void 0;
    const hasOpacityB = b.opacity !== void 0;
    return hasOpacityB ? 1 : hasOpacityA ? -1 : 0;
  }).map(([tag, attrs]) => {
    const isSecondaryPath = attrs.opacity !== void 0;
    const pathOpacity = isSecondaryPath && !disableSecondaryOpacity ? attrs.opacity : void 0;
    const fillProps = secondaryColor ? {
      ...attrs.stroke !== void 0 ? {
        stroke: isSecondaryPath ? secondaryColor : primaryColor || color
      } : {
        fill: isSecondaryPath ? secondaryColor : primaryColor || color
      }
    } : {};
    return createElement(tag, {
      ...attrs,
      ...strokeProps,
      ...fillProps,
      opacity: pathOpacity,
      key: attrs.key
    });
  });
  return createElement("svg", elementProps, svgChildren);
});
HugeiconsIcon.displayName = "HugeiconsIcon";

// node_modules/@hugeicons/core-free-icons/dist/esm/index.js
var AlertCircleIcon = [
  ["circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 8V12", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M12.125 15.75H12M12.25 15.75C12.25 15.8881 12.1381 16 12 16C11.8619 16 11.75 15.8881 11.75 15.75C11.75 15.6119 11.8619 15.5 12 15.5C12.1381 15.5 12.25 15.6119 12.25 15.75Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var ArchiveIcon = [
  ["path", { d: "M13 2H11C7.22876 2 5.34315 2 4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V10C21 6.22876 21 4.34315 19.8284 3.17157C18.6569 2 16.7712 2 13 2Z", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M21 12H3", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M15 7H9", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M15 17H9", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "3" }]
];
var ArrowDown01Icon = [
  ["path", { d: "M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var ArrowRight01Icon = [
  ["path", { d: "M9.00005 6C9.00005 6 15 10.4189 15 12C15 13.5812 9 18 9 18", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var ArrowUp01Icon = [
  ["path", { d: "M17.9998 15C17.9998 15 13.5809 9.00001 11.9998 9C10.4187 8.99999 5.99985 15 5.99985 15", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var Cancel01Icon = [
  ["path", { d: "M18 6L6.00081 17.9992M17.9992 18L6 6.00085", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var CancelCircleIcon = [
  ["path", { d: "M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M14.9994 15L9 9M9.00064 15L15 9", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
];
var CheckListIcon = [
  ["path", { d: "M11 6L21 6", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M11 12L21 12", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M11 18L21 18", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M3 7.39286C3 7.39286 4 8.04466 4.5 9C4.5 9 6 5.25 8 4", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "3" }],
  ["path", { d: "M3 18.3929C3 18.3929 4 19.0447 4.5 20C4.5 20 6 16.25 8 15", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "4" }]
];
var CheckmarkCircle02Icon = [
  ["path", { d: "M22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12Z", stroke: "currentColor", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M8 12.5L10.5 15L16 9", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
];
var CircleIcon = [
  ["circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var Clock05Icon = [
  ["path", { d: "M12 22C6.47714 22 2.00003 17.5228 2.00003 12C2.00003 6.47715 6.47718 2 12 2C16.4777 2 20.2257 4.94289 21.5 9H19", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 8V12L14 14", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M21.9551 13C21.9848 12.6709 22 12.3373 22 12M15 22C15.3416 21.8876 15.6753 21.7564 16 21.6078M20.7906 17C20.9835 16.6284 21.1555 16.2433 21.305 15.8462M18.1925 20.2292C18.5369 19.9441 18.8631 19.6358 19.1688 19.3065", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var ComputerTerminal01Icon = [
  ["path", { d: "M7.5 7.5L8.72654 8.55719C9.24218 9.00163 9.5 9.22386 9.5 9.5C9.5 9.77614 9.24218 9.99836 8.72654 10.4428L7.5 11.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M11.5 12.5H15.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M12 21C15.7497 21 17.6246 21 18.9389 20.0451C19.3634 19.7367 19.7367 19.3634 20.0451 18.9389C21 17.6246 21 15.7497 21 12C21 8.25027 21 6.3754 20.0451 5.06107C19.7367 4.6366 19.3634 4.26331 18.9389 3.95491C17.6246 3 15.7497 3 12 3C8.25027 3 6.3754 3 5.06107 3.95491C4.6366 4.26331 4.26331 4.6366 3.95491 5.06107C3 6.3754 3 8.25027 3 12C3 15.7497 3 17.6246 3.95491 18.9389C4.26331 19.3634 4.6366 19.7367 5.06107 20.0451C6.3754 21 8.25027 21 12 21Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var DashedLineCircleIcon = [
  ["path", { d: "M14 2.20004C13.3538 2.06886 12.6849 2 12 2C11.3151 2 10.6462 2.06886 10 2.20004M21.8 10C21.9311 10.6462 22 11.3151 22 12C22 12.6849 21.9311 13.3538 21.8 14M14 21.8C13.3538 21.9311 12.6849 22 12 22C11.3151 22 10.6462 21.9311 10 21.8M2.20004 14C2.06886 13.3538 2 12.6849 2 12C2 11.3151 2.06886 10.6462 2.20004 10M17.5 3.64702C18.6332 4.39469 19.6053 5.36678 20.353 6.5M20.353 17.5C19.6053 18.6332 18.6332 19.6053 17.5 20.353M6.5 20.353C5.36678 19.6053 4.39469 18.6332 3.64702 17.5M3.64702 6.5C4.39469 5.36678 5.36678 4.39469 6.5 3.64702", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var Delete02Icon = [
  ["path", { d: "M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M9.5 16.5L9.5 10.5", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M14.5 16.5L14.5 10.5", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "3" }]
];
var Edit02Icon = [
  ["path", { d: "M14.0737 3.88545C14.8189 3.07808 15.1915 2.6744 15.5874 2.43893C16.5427 1.87076 17.7191 1.85309 18.6904 2.39232C19.0929 2.6158 19.4769 3.00812 20.245 3.79276C21.0131 4.5774 21.3972 4.96972 21.6159 5.38093C22.1438 6.37312 22.1265 7.57479 21.5703 8.5507C21.3398 8.95516 20.9446 9.33578 20.1543 10.097L10.7506 19.1543C9.25288 20.5969 8.504 21.3182 7.56806 21.6837C6.63212 22.0493 5.6032 22.0224 3.54536 21.9686L3.26538 21.9613C2.63891 21.9449 2.32567 21.9367 2.14359 21.73C1.9615 21.5234 1.98636 21.2043 2.03608 20.5662L2.06308 20.2197C2.20301 18.4235 2.27297 17.5255 2.62371 16.7182C2.97444 15.9109 3.57944 15.2555 4.78943 13.9445L14.0737 3.88545Z", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M13 4L20 11", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M14 22L22 22", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var HelpCircleIcon = [
  ["circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M9.5 9.5C9.5 8.11929 10.6193 7 12 7C13.3807 7 14.5 8.11929 14.5 9.5C14.5 10.3569 14.0689 11.1131 13.4117 11.5636C12.7283 12.0319 12 12.6716 12 13.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M12.125 16.75H12M12.25 16.75C12.25 16.8881 12.1381 17 12 17C11.8619 17 11.75 16.8881 11.75 16.75C11.75 16.6119 11.8619 16.5 12 16.5C12.1381 16.5 12.25 16.6119 12.25 16.75Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var LayoutTwoColumnIcon = [
  ["path", { d: "M3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 2.5V21.5", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }]
];
var Loading03Icon = [
  ["path", { d: "M12 3V6", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 18V21", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M21 12L18 12", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M6 12L3 12", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "3" }],
  ["path", { d: "M18.3635 5.63672L16.2422 7.75804", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "4" }],
  ["path", { d: "M7.75804 16.2422L5.63672 18.3635", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "5" }],
  ["path", { d: "M18.3635 18.3635L16.2422 16.2422", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "6" }],
  ["path", { d: "M7.75804 7.75804L5.63672 5.63672", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "7" }]
];
var Mail01Icon = [
  ["path", { d: "M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
];
var MailOpenIcon = [
  ["path", { d: "M5.00035 7L3.78154 7.81253C2.90783 8.39501 2.47097 8.68625 2.23422 9.13041C1.99747 9.57457 1.99923 10.0966 2.00273 11.1406C2.00696 12.3975 2.01864 13.6782 2.05099 14.9741C2.12773 18.0487 2.16611 19.586 3.29651 20.7164C4.42691 21.8469 5.98497 21.8858 9.10108 21.9637C11.0397 22.0121 12.9611 22.0121 14.8996 21.9637C18.0158 21.8858 19.5738 21.8469 20.7042 20.7164C21.8346 19.586 21.873 18.0487 21.9497 14.9741C21.9821 13.6782 21.9937 12.3975 21.998 11.1406C22.0015 10.0966 22.0032 9.57456 21.7665 9.13041C21.5297 8.68625 21.0929 8.39501 20.2191 7.81253L19.0003 7", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M2 10L8.91302 14.1478C10.417 15.0502 11.169 15.5014 12 15.5014C12.831 15.5014 13.583 15.0502 15.087 14.1478L22 10", stroke: "currentColor", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M4.99998 12V6C4.99998 4.11438 4.99998 3.17157 5.58577 2.58579C6.17156 2 7.11437 2 8.99998 2H15C16.8856 2 17.8284 2 18.4142 2.58579C19 3.17157 19 4.11438 19 6V12", stroke: "currentColor", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M10 10H14M10 6H14", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "3" }]
];
var MoreHorizontalIcon = [
  ["path", { d: "M6.00449 12.5V12M18.0045 12.5V12M12.0045 12.5V12M7.00449 12.5C7.00449 11.9477 6.55677 11.5 6.00449 11.5C5.4522 11.5 5.00449 11.9477 5.00449 12.5C5.00449 13.0523 5.4522 13.5 6.00449 13.5C6.55677 13.5 7.00449 13.0523 7.00449 12.5ZM19.0045 12.5C19.0045 11.9477 18.5568 11.5 18.0045 11.5C17.4522 11.5 17.0045 11.9477 17.0045 12.5C17.0045 13.0523 17.4522 13.5 18.0045 13.5C18.5568 13.5 19.0045 13.0523 19.0045 12.5ZM13.0045 12.5C13.0045 11.9477 12.5568 11.5 12.0045 11.5C11.4522 11.5 11.0045 11.9477 11.0045 12.5C11.0045 13.0523 11.4522 13.5 12.0045 13.5C12.5568 13.5 13.0045 13.0523 13.0045 12.5Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var PinOffIcon = [
  ["path", { d: "M7.5 8C6.95863 8.1281 6.49932 8.14239 5.99268 8.45891C5.07234 9.03388 4.85108 9.71674 5.08821 10.7612C5.94028 14.5139 9.48599 18.0596 13.2388 18.9117C14.2834 19.1489 14.9661 18.928 15.5416 18.0077C15.8411 17.5288 15.8716 17.0081 16 16.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 7.79915C12.1776 7.77794 12.3182 7.74034 12.4295 7.68235C13.3997 7.17686 13.9291 5.53361 14.4498 4.60009C14.9311 3.73715 15.1718 3.30567 15.7379 3.10227C16.3041 2.89888 16.6448 3.02205 17.3262 3.26839C18.9197 3.8445 20.1555 5.08032 20.7316 6.6738C20.9779 7.35521 21.1011 7.69591 20.8977 8.26204C20.6943 8.82817 20.2628 9.06884 19.3999 9.55018C18.4608 10.074 16.7954 10.6108 16.2905 11.5898C16.2345 11.6983 16.1978 11.8327 16.1769 12", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M3 21L8 16", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M3 3L21 21", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "3" }]
];
var PinIcon = [
  ["path", { d: "M3 21L8 16", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M13.2585 18.8714C9.51516 18.0215 5.97844 14.4848 5.12853 10.7415C4.99399 10.1489 4.92672 9.85266 5.12161 9.37197C5.3165 8.89129 5.55457 8.74255 6.03071 8.44509C7.10705 7.77265 8.27254 7.55888 9.48209 7.66586C11.1793 7.81598 12.0279 7.89104 12.4512 7.67048C12.8746 7.44991 13.1622 6.93417 13.7376 5.90269L14.4664 4.59604C14.9465 3.73528 15.1866 3.3049 15.7513 3.10202C16.316 2.89913 16.6558 3.02199 17.3355 3.26771C18.9249 3.84236 20.1576 5.07505 20.7323 6.66449C20.978 7.34417 21.1009 7.68401 20.898 8.2487C20.6951 8.8134 20.2647 9.05346 19.4039 9.53358L18.0672 10.2792C17.0376 10.8534 16.5229 11.1406 16.3024 11.568C16.0819 11.9955 16.162 12.8256 16.3221 14.4859C16.4399 15.7068 16.2369 16.88 15.5555 17.9697C15.2577 18.4458 15.1088 18.6839 14.6283 18.8786C14.1477 19.0733 13.8513 19.006 13.2585 18.8714Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
];
var Search01Icon = [
  ["path", { d: "M17 17L21 21", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }]
];
var Target02Icon = [
  ["path", { d: "M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M14 2.20004C13.3538 2.06886 12.6849 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 11.3151 21.9311 10.6462 21.8 10", stroke: "currentColor", strokeLinecap: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M12.0303 11.9625L16.5832 7.4096M19.7404 4.34462L19.1872 2.35748C19.0853 2.03011 18.6914 1.89965 18.4259 2.11662C16.9898 3.29018 15.4254 4.87091 16.703 7.36419C19.2771 8.56455 20.7466 6.94584 21.8733 5.5853C22.0975 5.3146 21.9623 4.90767 21.6247 4.81005L19.7404 4.34462Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var Tick02Icon = [
  ["path", { d: "M5 14L8.5 17.5L19 6.5", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }]
];
var UserAdd01Icon = [
  ["path", { d: "M15 8C15 5.23858 12.7614 3 10 3C7.23858 3 5 5.23858 5 8C5 10.7614 7.23858 13 10 13C12.7614 13 15 10.7614 15 8Z", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M17.5 21L17.5 14M14 17.5H21", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M3 20C3 16.134 6.13401 13 10 13C11.4872 13 12.8662 13.4638 14 14.2547", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "2" }]
];
var WorkflowCircle03Icon = [
  ["path", { d: "M15 5C15 6.65685 13.6569 8 12 8C10.3431 8 9 6.65685 9 5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5Z", stroke: "currentColor", strokeWidth: "1.5", key: "0" }],
  ["path", { d: "M12 8V9M12 9C12 9.93188 12 10.3978 12.1776 10.7654C12.4144 11.2554 12.8687 11.6448 13.4404 11.8478C13.8692 12 14.4128 12 15.5 12C16.5872 12 17.1308 12 17.5596 12.1522C18.1313 12.3552 18.5856 12.7446 18.8224 13.2346C19 13.6022 19 14.0681 19 15V16M12 9C12 9.93188 12 10.3978 11.8224 10.7654C11.5856 11.2554 11.1313 11.6448 10.5596 11.8478C10.1308 12 9.5872 12 8.5 12C7.4128 12 6.8692 12 6.44041 12.1522C5.86867 12.3552 5.41443 12.7446 5.17761 13.2346C5 13.6022 5 14.0681 5 15V16", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "1.5", key: "1" }],
  ["path", { d: "M8 19C8 20.6569 6.65685 22 5 22C3.34315 22 2 20.6569 2 19C2 17.3431 3.34315 16 5 16C6.65685 16 8 17.3431 8 19Z", stroke: "currentColor", strokeWidth: "1.5", key: "2" }],
  ["path", { d: "M22 19C22 20.6569 20.6569 22 19 22C17.3431 22 16 20.6569 16 19C16 17.3431 17.3431 16 19 16C20.6569 16 22 17.3431 22 19Z", stroke: "currentColor", strokeWidth: "1.5", key: "3" }]
];

// bb-plugin-runtime-shim:react/jsx-runtime
var runtime4 = globalThis.__bbPluginRuntime;
if (runtime4 == null || runtime4.jsxRuntime == null) {
  throw new Error('Cannot load "react/jsx-runtime": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod4 = runtime4.jsxRuntime;
var {
  Fragment: Fragment2,
  jsx,
  jsxs
} = mod4;

// components/Icon.tsx
var ICONS = {
  Archive: ArchiveIcon,
  AlertCircle: AlertCircleIcon,
  ArrowDown: ArrowDown01Icon,
  ArrowUp: ArrowUp01Icon,
  CancelCircle: CancelCircleIcon,
  Check: Tick02Icon,
  CheckmarkCircle: CheckmarkCircle02Icon,
  ChevronRight: ArrowRight01Icon,
  Circle: CircleIcon,
  CircleQuestion: HelpCircleIcon,
  CircleX: CancelCircleIcon,
  Clock: Clock05Icon,
  Close: Cancel01Icon,
  Columns2: LayoutTwoColumnIcon,
  Edit: Edit02Icon,
  DashedCircle: DashedLineCircleIcon,
  ListTodo: CheckListIcon,
  Loading: Loading03Icon,
  Mail: Mail01Icon,
  MailOpen: MailOpenIcon,
  MoreHorizontal: MoreHorizontalIcon,
  Pin: PinIcon,
  PinOff: PinOffIcon,
  Search: Search01Icon,
  Target: Target02Icon,
  Terminal: ComputerTerminal01Icon,
  Trash: Delete02Icon,
  UserRoundPlus: UserAdd01Icon,
  Workflow: WorkflowCircle03Icon
};
function Icon({
  name,
  className,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel
}) {
  return /* @__PURE__ */ jsx(
    HugeiconsIcon,
    {
      icon: ICONS[name],
      size: 16,
      className,
      "aria-hidden": ariaHidden,
      "aria-label": ariaLabel,
      "data-icon": name
    }
  );
}

// components/TaskStatusIcon.tsx
var TASK_STATUS_ICONS = {
  Done: "CheckmarkCircle",
  "To do": "Circle",
  Working: "Loading",
  Waiting: "Clock",
  Deferred: "DashedCircle",
  Canceled: "CancelCircle"
};
function TaskStatusIcon({
  status,
  className
}) {
  return /* @__PURE__ */ jsx(
    Icon,
    {
      name: TASK_STATUS_ICONS[status],
      className,
      "aria-hidden": true
    }
  );
}

// bb-plugin-runtime-shim:@radix-ui/react-context-menu
var runtime5 = globalThis.__bbPluginRuntime;
if (runtime5 == null || runtime5.radixContextMenu == null) {
  throw new Error('Cannot load "@radix-ui/react-context-menu": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod5 = runtime5.radixContextMenu;
var {
  Arrow,
  CheckboxItem,
  Content,
  ContextMenu,
  ContextMenuArrow,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuItemIndicator,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Group,
  Item,
  ItemIndicator,
  Label,
  Portal,
  RadioGroup,
  RadioItem,
  Root,
  Separator,
  Sub,
  SubContent,
  SubTrigger,
  Trigger,
  createContextMenuScope
} = mod5;

// bb-plugin-runtime-shim:@radix-ui/react-dropdown-menu
var runtime6 = globalThis.__bbPluginRuntime;
if (runtime6 == null || runtime6.radixDropdownMenu == null) {
  throw new Error('Cannot load "@radix-ui/react-dropdown-menu": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod6 = runtime6.radixDropdownMenu;
var {
  Arrow: Arrow2,
  CheckboxItem: CheckboxItem2,
  Content: Content2,
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Group: Group2,
  Item: Item2,
  ItemIndicator: ItemIndicator2,
  Label: Label2,
  Portal: Portal2,
  RadioGroup: RadioGroup2,
  RadioItem: RadioItem2,
  Root: Root2,
  Separator: Separator2,
  Sub: Sub2,
  SubContent: SubContent2,
  SubTrigger: SubTrigger2,
  Trigger: Trigger2,
  createDropdownMenuScope
} = mod6;

// lib/portal-scope.ts
function portalScopeProps() {
  const pluginId = true ? "thread-tasks" : void 0;
  return {
    "data-bb-portaled-overlay": "",
    "data-bb-plugin-root": "",
    ...pluginId === void 0 ? {} : { "data-bb-plugin": pluginId }
  };
}

// components/ThreadActionsMenu.tsx
var CONTENT_CLASS = "z-[70] min-w-28 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
var SUB_CONTENT_CLASS = "z-[70] min-w-28 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md";
var ITEM_CLASS = "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-[0.3125rem] text-xs outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground [&>svg]:size-4 [&>svg]:shrink-0";
var DESTRUCTIVE_ITEM_CLASS = `${ITEM_CLASS} text-destructive data-[highlighted]:bg-destructive/15 data-[highlighted]:text-destructive`;
var SEPARATOR_CLASS = "-mx-1 my-1 h-px bg-border";
function ThreadActionsContextMenu({
  children,
  onOpenChange,
  ...props
}) {
  return /* @__PURE__ */ jsxs(Root, { onOpenChange, children: [
    /* @__PURE__ */ jsx(Trigger, { asChild: true, children }),
    /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx(
      Content,
      {
        ...portalScopeProps(),
        "aria-label": "Thread actions",
        className: CONTENT_CLASS,
        children: /* @__PURE__ */ jsx(ContextMenuItems, { ...props })
      }
    ) })
  ] });
}
function ThreadActionsDropdown({
  onOpenChange,
  ...props
}) {
  return /* @__PURE__ */ jsxs(Root2, { onOpenChange, children: [
    /* @__PURE__ */ jsx(Trigger2, { asChild: true, children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "Thread actions",
        className: "relative m-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md p-0 text-subtle-foreground outline-none ring-sidebar-ring after:absolute after:left-1/2 after:top-1/2 after:h-7 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:text-foreground focus-visible:ring-2 data-[state=open]:bg-state-active data-[state=open]:text-foreground",
        onClick: (event) => event.stopPropagation(),
        onDragStart: (event) => event.preventDefault(),
        children: /* @__PURE__ */ jsx(Icon, { name: "MoreHorizontal", className: "size-4", "aria-hidden": true })
      }
    ) }),
    /* @__PURE__ */ jsx(Portal2, { children: /* @__PURE__ */ jsx(
      Content2,
      {
        ...portalScopeProps(),
        align: "end",
        sideOffset: 4,
        className: CONTENT_CLASS,
        children: /* @__PURE__ */ jsx(DropdownMenuItems, { ...props })
      }
    ) })
  ] });
}
function ContextMenuItems(props) {
  const { actions, disabled, taskStatus, thread } = props;
  return /* @__PURE__ */ jsxs(Fragment2, { children: [
    props.splitAvailable ? /* @__PURE__ */ jsxs(Fragment2, { children: [
      /* @__PURE__ */ jsx(
        ContextItem,
        {
          icon: "Columns2",
          onSelect: () => actions.open(thread.id, { split: true }),
          children: "Open in split"
        }
      ),
      /* @__PURE__ */ jsx(Separator, { className: SEPARATOR_CLASS })
    ] }) : null,
    /* @__PURE__ */ jsx(
      ContextItem,
      {
        icon: thread.isUnread ? "MailOpen" : "Mail",
        onSelect: () => void actions.setRead(thread.id, thread.isUnread),
        children: thread.isUnread ? "Mark read" : "Mark unread"
      }
    ),
    /* @__PURE__ */ jsx(
      ContextItem,
      {
        icon: thread.isPinned ? "PinOff" : "Pin",
        onSelect: () => void actions.setPinned(thread.id, !thread.isPinned),
        children: thread.isPinned ? "Unpin" : "Pin"
      }
    ),
    /* @__PURE__ */ jsx(ContextItem, { icon: "Edit", onSelect: props.onRename, children: "Rename" }),
    /* @__PURE__ */ jsx(Separator, { className: SEPARATOR_CLASS }),
    /* @__PURE__ */ jsxs(Sub, { children: [
      /* @__PURE__ */ jsxs(
        SubTrigger,
        {
          disabled,
          className: ITEM_CLASS,
          children: [
            /* @__PURE__ */ jsx(Icon, { name: "ListTodo", "aria-hidden": true }),
            "Task status",
            /* @__PURE__ */ jsx(Icon, { name: "ChevronRight", className: "ml-auto", "aria-hidden": true })
          ]
        }
      ),
      /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx(
        SubContent,
        {
          ...portalScopeProps(),
          className: SUB_CONTENT_CLASS,
          children: THREAD_STATUSES.map((status) => /* @__PURE__ */ jsxs(
            Item,
            {
              className: ITEM_CLASS,
              onSelect: () => {
                if (status !== taskStatus) props.onSetTaskStatus(status);
              },
              children: [
                /* @__PURE__ */ jsx("span", { className: "w-4", children: status === taskStatus ? /* @__PURE__ */ jsx(Icon, { name: "Check", "aria-hidden": true }) : null }),
                status
              ]
            },
            status
          ))
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx(
      ContextItem,
      {
        disabled: disabled || !props.canMoveUp,
        icon: "ArrowUp",
        onSelect: props.onMoveUp,
        children: "Move up"
      }
    ),
    /* @__PURE__ */ jsx(
      ContextItem,
      {
        disabled: disabled || !props.canMoveDown,
        icon: "ArrowDown",
        onSelect: props.onMoveDown,
        children: "Move down"
      }
    ),
    /* @__PURE__ */ jsx(Separator, { className: SEPARATOR_CLASS }),
    /* @__PURE__ */ jsx(ContextItem, { icon: "Archive", onSelect: () => actions.archive(thread.id), children: "Archive" }),
    /* @__PURE__ */ jsx(
      ContextItem,
      {
        destructive: true,
        icon: "Trash",
        onSelect: () => actions.requestDelete(thread.id),
        children: "Delete"
      }
    )
  ] });
}
function DropdownMenuItems(props) {
  const { actions, disabled, taskStatus, thread } = props;
  return /* @__PURE__ */ jsxs(Fragment2, { children: [
    props.splitAvailable ? /* @__PURE__ */ jsxs(Fragment2, { children: [
      /* @__PURE__ */ jsx(
        DropdownItem,
        {
          icon: "Columns2",
          onSelect: () => actions.open(thread.id, { split: true }),
          children: "Open in split"
        }
      ),
      /* @__PURE__ */ jsx(Separator2, { className: SEPARATOR_CLASS })
    ] }) : null,
    /* @__PURE__ */ jsx(
      DropdownItem,
      {
        icon: thread.isUnread ? "MailOpen" : "Mail",
        onSelect: () => void actions.setRead(thread.id, thread.isUnread),
        children: thread.isUnread ? "Mark read" : "Mark unread"
      }
    ),
    /* @__PURE__ */ jsx(
      DropdownItem,
      {
        icon: thread.isPinned ? "PinOff" : "Pin",
        onSelect: () => void actions.setPinned(thread.id, !thread.isPinned),
        children: thread.isPinned ? "Unpin" : "Pin"
      }
    ),
    /* @__PURE__ */ jsx(DropdownItem, { icon: "Edit", onSelect: props.onRename, children: "Rename" }),
    /* @__PURE__ */ jsx(Separator2, { className: SEPARATOR_CLASS }),
    /* @__PURE__ */ jsxs(Sub2, { children: [
      /* @__PURE__ */ jsxs(SubTrigger2, { disabled, className: ITEM_CLASS, children: [
        /* @__PURE__ */ jsx(Icon, { name: "ListTodo", "aria-hidden": true }),
        "Task status",
        /* @__PURE__ */ jsx(Icon, { name: "ChevronRight", className: "ml-auto", "aria-hidden": true })
      ] }),
      /* @__PURE__ */ jsx(Portal2, { children: /* @__PURE__ */ jsx(
        SubContent2,
        {
          ...portalScopeProps(),
          className: SUB_CONTENT_CLASS,
          children: THREAD_STATUSES.map((status) => /* @__PURE__ */ jsxs(
            Item2,
            {
              className: ITEM_CLASS,
              onSelect: () => {
                if (status !== taskStatus) props.onSetTaskStatus(status);
              },
              children: [
                /* @__PURE__ */ jsx("span", { className: "w-4", children: status === taskStatus ? /* @__PURE__ */ jsx(Icon, { name: "Check", "aria-hidden": true }) : null }),
                status
              ]
            },
            status
          ))
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx(
      DropdownItem,
      {
        disabled: disabled || !props.canMoveUp,
        icon: "ArrowUp",
        onSelect: props.onMoveUp,
        children: "Move up"
      }
    ),
    /* @__PURE__ */ jsx(
      DropdownItem,
      {
        disabled: disabled || !props.canMoveDown,
        icon: "ArrowDown",
        onSelect: props.onMoveDown,
        children: "Move down"
      }
    ),
    /* @__PURE__ */ jsx(Separator2, { className: SEPARATOR_CLASS }),
    /* @__PURE__ */ jsx(DropdownItem, { icon: "Archive", onSelect: () => actions.archive(thread.id), children: "Archive" }),
    /* @__PURE__ */ jsx(
      DropdownItem,
      {
        destructive: true,
        icon: "Trash",
        onSelect: () => actions.requestDelete(thread.id),
        children: "Delete"
      }
    )
  ] });
}
function ContextItem({
  children,
  destructive = false,
  disabled,
  icon,
  onSelect
}) {
  return /* @__PURE__ */ jsxs(
    Item,
    {
      disabled,
      className: destructive ? DESTRUCTIVE_ITEM_CLASS : ITEM_CLASS,
      onSelect,
      children: [
        /* @__PURE__ */ jsx(Icon, { name: icon, "aria-hidden": true }),
        children
      ]
    }
  );
}
function DropdownItem({
  children,
  destructive = false,
  disabled,
  icon,
  onSelect
}) {
  return /* @__PURE__ */ jsxs(
    Item2,
    {
      disabled,
      className: destructive ? DESTRUCTIVE_ITEM_CLASS : ITEM_CLASS,
      onSelect,
      children: [
        /* @__PURE__ */ jsx(Icon, { name: icon, "aria-hidden": true }),
        children
      ]
    }
  );
}

// components/ThreadIndicator.tsx
function ThreadIndicator({
  indicator,
  label
}) {
  const iconClass = "size-4 shrink-0";
  const ariaLabel = label ?? void 0;
  switch (indicator) {
    case "unread-error":
      return /* @__PURE__ */ jsx(
        Icon,
        {
          name: "CircleX",
          "aria-label": ariaLabel,
          className: `${iconClass} text-destructive`
        }
      );
    case "waiting-for-input":
      return /* @__PURE__ */ jsx(
        Icon,
        {
          name: "CircleQuestion",
          "aria-label": ariaLabel,
          className: `${iconClass} text-muted-foreground/75`
        }
      );
    case "runtime":
      return /* @__PURE__ */ jsx(
        Icon,
        {
          name: "Loading",
          "aria-label": ariaLabel,
          className: `${iconClass} animate-spin text-muted-foreground/50`
        }
      );
    case "workflow":
      return /* @__PURE__ */ jsx(WorkingIcon, { name: "Workflow", label: ariaLabel });
    case "background-agent":
      return /* @__PURE__ */ jsx(WorkingIcon, { name: "UserRoundPlus", label: ariaLabel });
    case "background-command":
      return /* @__PURE__ */ jsx(WorkingIcon, { name: "Terminal", label: ariaLabel });
    case "plan-mode":
      return /* @__PURE__ */ jsx(WorkingIcon, { name: "ListTodo", label: ariaLabel });
    case "goal":
      return /* @__PURE__ */ jsx(WorkingIcon, { name: "Target", label: ariaLabel });
    case "draft":
      return /* @__PURE__ */ jsx(
        Icon,
        {
          name: "Edit",
          "aria-label": ariaLabel,
          className: `${iconClass} text-muted-foreground`
        }
      );
    case "working-draft":
      return /* @__PURE__ */ jsx(
        Icon,
        {
          name: "Edit",
          "aria-label": ariaLabel,
          className: `${iconClass} animate-shine-icon text-muted-foreground/50`
        }
      );
    case "unread-success":
      return /* @__PURE__ */ jsx(
        "span",
        {
          "aria-label": ariaLabel,
          className: "flex size-4 shrink-0 items-center justify-center",
          children: /* @__PURE__ */ jsx("span", { className: "size-[5px] rounded-full bg-muted-foreground/60" })
        }
      );
    case "none":
    default:
      return null;
  }
}
function WorkingIcon({
  name,
  label
}) {
  return /* @__PURE__ */ jsx(
    Icon,
    {
      name,
      "aria-label": label,
      className: "size-4 shrink-0 animate-shine-icon text-muted-foreground/50"
    }
  );
}
var INDICATOR_PRIORITY = [
  "unread-error",
  "waiting-for-input",
  "working-draft",
  "workflow",
  "background-agent",
  "background-command",
  "plan-mode",
  "goal",
  "runtime",
  "draft",
  "unread-success"
];
function groupIndicator(threads) {
  for (const indicator of INDICATOR_PRIORITY) {
    const thread = threads.find((candidate) => candidate.indicator === indicator);
    if (thread) return thread;
  }
  return null;
}

// components/SplitPaneMiniMap.tsx
function SplitPaneMiniMap({
  layout,
  label,
  isWorking
}) {
  const representsFocusedPane = layout.panes.some(
    (pane) => pane.isMe && pane.isFocused
  );
  return /* @__PURE__ */ jsx(
    "svg",
    {
      width: "14",
      height: "14",
      viewBox: "0 0 14 14",
      className: `pointer-events-none size-3.5 shrink-0 ${representsFocusedPane ? "" : "opacity-60"} ${isWorking ? "animate-shine-icon" : ""}`,
      shapeRendering: "crispEdges",
      role: "img",
      "aria-label": label,
      children: layout.panes.map((pane) => {
        const inset = pane.isMe ? 0 : 0.5;
        return /* @__PURE__ */ jsx(
          "rect",
          {
            x: 1 + pane.rect.x * 12 + inset,
            y: 1 + pane.rect.y * 12 + inset,
            width: Math.max(pane.rect.width * 12 - inset * 2, 0),
            height: Math.max(pane.rect.height * 12 - inset * 2, 0),
            strokeWidth: pane.isMe ? 0 : 1,
            className: pane.isMe ? pane.isFocused ? "fill-primary/70 stroke-none" : "fill-muted-foreground/45 stroke-none" : "fill-none stroke-muted-foreground/30"
          },
          pane.paneId
        );
      })
    }
  );
}

// bb-plugin-runtime-shim:@radix-ui/react-dialog
var runtime7 = globalThis.__bbPluginRuntime;
if (runtime7 == null || runtime7.radixDialog == null) {
  throw new Error('Cannot load "@radix-ui/react-dialog": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod7 = runtime7.radixDialog;
var {
  Close,
  Content: Content3,
  Description,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Overlay,
  Portal: Portal3,
  Root: Root3,
  Title,
  Trigger: Trigger3,
  WarningProvider,
  createDialogScope
} = mod7;

// components/ThreadRenameDialog.tsx
function ThreadRenameDialog({
  currentTitle,
  open,
  onOpenChange,
  onRename
}) {
  const [nextTitle, setNextTitle] = useState(currentTitle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setNextTitle(currentTitle);
    setError(null);
  }, [currentTitle, open]);
  function handleOpenChange(nextOpen) {
    if (pending) return;
    if (nextOpen) {
      setNextTitle(currentTitle);
      setError(null);
    }
    onOpenChange(nextOpen);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const title = nextTitle.trim();
    if (!title) {
      setError("Thread name cannot be empty.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onRename(title);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not rename thread."
      );
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ jsx(Root3, { open, onOpenChange: handleOpenChange, children: /* @__PURE__ */ jsxs(Portal3, { children: [
    /* @__PURE__ */ jsx(
      Overlay,
      {
        ...portalScopeProps(),
        className: "fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
      }
    ),
    /* @__PURE__ */ jsxs(
      Content3,
      {
        ...portalScopeProps(),
        className: "fixed left-1/2 top-1/2 z-50 w-full max-w-[24rem] -translate-x-1/2 -translate-y-1/2 border bg-background shadow-sm sm:rounded-lg max-md:w-[calc(100%_-_2rem)]",
        onOpenAutoFocus: (event) => {
          event.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[minmax(0,1fr)] gap-3 p-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-1.5 text-left", children: [
              /* @__PURE__ */ jsx(Title, { className: "text-base font-semibold leading-none tracking-tight", children: "Rename thread" }),
              /* @__PURE__ */ jsx(Description, { className: "text-sm text-muted-foreground", children: "Choose a new name for this thread." })
            ] }),
            /* @__PURE__ */ jsxs(
              "form",
              {
                className: "space-y-3",
                onSubmit: (event) => void handleSubmit(event),
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        ref: inputRef,
                        "aria-label": "Thread name",
                        autoCapitalize: "sentences",
                        autoComplete: "off",
                        autoCorrect: "off",
                        className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        disabled: pending,
                        spellCheck: false,
                        value: nextTitle,
                        onChange: (event) => {
                          setNextTitle(event.currentTarget.value);
                          setError(null);
                        }
                      }
                    ),
                    error ? /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive", children: error }) : null
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", children: /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "submit",
                      disabled: pending,
                      className: "inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                      children: "Rename thread"
                    }
                  ) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            Close,
            {
              "aria-label": "Close",
              disabled: pending,
              className: "absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-state-active data-[state=open]:text-foreground",
              children: /* @__PURE__ */ jsx(Icon, { name: "Close", className: "size-4", "aria-hidden": true })
            }
          )
        ]
      }
    )
  ] }) });
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

// persistent-string-set.ts
function parseStoredStringSet(raw, allowedValues) {
  if (raw === null) return /* @__PURE__ */ new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
    return new Set(
      parsed.filter(
        (value) => typeof value === "string" && (allowedValues === void 0 || allowedValues.has(value))
      )
    );
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function readStoredStringSet(key, allowedValues) {
  try {
    return parseStoredStringSet(window.localStorage.getItem(key), allowedValues);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function usePersistentStringSet(key, allowedValues) {
  const [values, setValues] = useState(
    () => readStoredStringSet(key, allowedValues)
  );
  useEffect(() => {
    function onStorage(event) {
      if (event.key === key) {
        setValues(parseStoredStringSet(event.newValue, allowedValues));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [allowedValues, key]);
  const setPersistentValues = useCallback(
    (nextValue) => {
      setValues((current) => {
        const next = typeof nextValue === "function" ? nextValue(current) : nextValue;
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
        }
        return next;
      });
    },
    [key]
  );
  return [values, setPersistentValues];
}

// task-sync.ts
function shouldSyncThreads({
  hasOrganization,
  loadError,
  sidebarStatus,
  syncInFlight,
  unsyncedCount
}) {
  return hasOrganization && loadError === null && sidebarStatus === "ready" && !syncInFlight && unsyncedCount > 0;
}

// task-shortcuts.ts
var STATUS_CHORDS = [
  { altKey: false, ctrlKey: false, shiftKey: false, status: "Done" },
  { altKey: false, ctrlKey: false, shiftKey: true, status: "To do" },
  { altKey: false, ctrlKey: true, shiftKey: true, status: "Waiting" },
  { altKey: false, ctrlKey: true, shiftKey: false, status: "Deferred" },
  { altKey: true, ctrlKey: false, shiftKey: false, status: "Canceled" }
];
function taskStatusShortcut(event) {
  if (!event.metaKey || event.repeat || event.key !== ".") return null;
  return STATUS_CHORDS.find(
    (chord) => chord.altKey === event.altKey && chord.ctrlKey === event.ctrlKey && chord.shiftKey === event.shiftKey
  )?.status ?? null;
}
function decodePathSegment(segment) {
  if (!segment) return null;
  try {
    return decodeURIComponent(segment) || null;
  } catch {
    return null;
  }
}
function currentThreadId(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "threads") {
    return decodePathSegment(segments[1]);
  }
  if (segments.length === 4 && segments[0] === "projects" && segments[2] === "threads") {
    return decodePathSegment(segments[3]);
  }
  return null;
}

// thread-hierarchy.ts
function effectiveHierarchyParentId(thread, threadIdsInGroup) {
  return thread.parentThreadId !== null && threadIdsInGroup.has(thread.parentThreadId) ? thread.parentThreadId : null;
}
function canDropThreadBeside(draggedThread, targetThread, destinationThreadIds) {
  return effectiveHierarchyParentId(draggedThread, destinationThreadIds) === effectiveHierarchyParentId(targetThread, destinationThreadIds);
}
function flattenThreadHierarchy(threads, collapsedThreadIds) {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const childrenByParent = /* @__PURE__ */ new Map();
  const roots = [];
  for (const thread of threads) {
    const parentId = thread.parentThreadId;
    if (parentId === null || parentId === thread.id || !byId.has(parentId)) {
      roots.push(thread);
      continue;
    }
    const children = childrenByParent.get(parentId) ?? [];
    children.push(thread);
    childrenByParent.set(parentId, children);
  }
  const rows = [];
  const visited = /* @__PURE__ */ new Set();
  function descendantsOf(thread, path) {
    const descendants = [];
    for (const child of childrenByParent.get(thread.id) ?? []) {
      if (path.has(child.id)) continue;
      descendants.push(child);
      const nextPath = new Set(path);
      nextPath.add(child.id);
      descendants.push(...descendantsOf(child, nextPath));
    }
    return descendants;
  }
  function visit(thread, depth) {
    if (visited.has(thread.id)) return;
    visited.add(thread.id);
    const children = childrenByParent.get(thread.id) ?? [];
    const isCollapsed = collapsedThreadIds.has(thread.id);
    const descendants = isCollapsed ? descendantsOf(thread, /* @__PURE__ */ new Set([thread.id])) : [];
    rows.push({
      thread,
      depth,
      hasChildren: children.length > 0,
      descendants
    });
    if (isCollapsed) {
      for (const descendant of descendants) visited.add(descendant.id);
      return;
    }
    for (const child of children) visit(child, depth + 1);
  }
  for (const root of roots) visit(root, 0);
  for (const thread of threads) visit(thread, 0);
  return rows;
}

// app.tsx
var COLLAPSED_STATUSES_STORAGE_KEY = "bb.plugin.thread-status.collapsedStatuses";
var COLLAPSED_THREADS_STORAGE_KEY = "bb.sidebar.collapsedThreads";
var PINNED_SECTION = "Pinned";
var COLLAPSIBLE_SECTION_SET = /* @__PURE__ */ new Set([
  PINNED_SECTION,
  ...THREAD_STATUSES
]);
function archivedSearchThread(thread) {
  return {
    ...thread,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0
    },
    indicator: "none",
    indicatorLabel: null,
    isUnread: false,
    isPinned: false,
    environment: null,
    host: null,
    createdAt: 0,
    updatedAt: 0,
    lastReadAt: null,
    latestAttentionAt: 0
  };
}
function threadTitle(thread) {
  return thread.title ?? thread.titleFallback ?? "Untitled thread";
}
function ThreadRow({
  actions,
  active,
  canMoveDown,
  canMoveUp,
  disabled,
  dragging,
  depth,
  hasChildren,
  childrenCollapsed,
  indicatorThread,
  onChangeStatus,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onNavigate,
  onToggleChildren,
  preview,
  reorderable,
  showDropAfter,
  showDropBefore,
  taskStatus,
  thread
}) {
  const { splitProps, isAvailable: splitAvailable, layout } = experimental_useSidebarThreadSplit(thread.id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const title = threadTitle(thread);
  const accessibleTitle = preview ? `${title} \u2014 ${preview}` : title;
  const actionsOpen = dropdownOpen || contextOpen;
  function openThread(event) {
    event.preventDefault();
    if (thread.isArchived) {
      window.location.assign(
        `/projects/${encodeURIComponent(thread.projectId)}/threads/${encodeURIComponent(thread.id)}`
      );
      onNavigate();
      return;
    }
    actions.open(thread.id, {
      split: splitAvailable && (event.metaKey || event.ctrlKey)
    });
    onNavigate();
  }
  const commonMenuProps = {
    actions,
    canMoveDown,
    canMoveUp,
    disabled,
    onMoveDown,
    onMoveUp,
    onRename: () => window.setTimeout(() => {
      setRenameOpen(true);
    }, 0),
    onSetTaskStatus: onChangeStatus,
    splitAvailable,
    taskStatus,
    thread
  };
  const row = /* @__PURE__ */ jsxs(
    "li",
    {
      className: "relative list-none",
      onDragOver: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragOver(event);
      },
      onDrop,
      children: [
        showDropBefore ? /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "pointer-events-none absolute -top-px left-2 right-2 z-20 h-0.5 rounded-full bg-primary"
          }
        ) : null,
        showDropAfter ? /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            className: "pointer-events-none absolute -bottom-px left-2 right-2 z-20 h-0.5 rounded-full bg-primary"
          }
        ) : null,
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: `bb-sidebar-hover-actions-row group/thread-row relative flex h-11 w-full items-center gap-2 rounded-md py-0.5 pr-0 text-sm transition-colors max-md:pointer-coarse:h-[52px] ${active ? "bg-state-active text-sidebar-foreground" : "cursor-pointer text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-sidebar-foreground"} ${!active && layout !== null ? "bg-sidebar-accent/50" : ""} ${dragging ? "opacity-40" : ""} ${disabled ? "" : "select-none"}`,
            draggable: reorderable && !disabled && !thread.isArchived,
            onDragEnd,
            onDragStart,
            style: { paddingLeft: 8 + depth * 24 },
            children: [
              Array.from({ length: depth }, (_, level) => /* @__PURE__ */ jsx(
                "span",
                {
                  "aria-hidden": "true",
                  className: "pointer-events-none absolute inset-y-0 z-[1] w-px bg-border-hairline opacity-70",
                  style: { left: 16 + level * 24 }
                },
                level
              )),
              /* @__PURE__ */ jsx(
                "a",
                {
                  ...splitProps,
                  "aria-label": `Open ${accessibleTitle}`,
                  className: "absolute inset-0 rounded-md outline-none ring-sidebar-ring focus-visible:ring-2",
                  "data-sidebar-thread-id": thread.id,
                  "data-sidebar-thread-shortcut-target": "",
                  draggable: false,
                  href: `/projects/${encodeURIComponent(thread.projectId)}/threads/${encodeURIComponent(thread.id)}`,
                  onClick: openThread
                }
              ),
              /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 flex-1 items-center gap-1.5", children: [
                /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 flex-1 flex-col justify-center leading-none", children: [
                  /* @__PURE__ */ jsx("span", { className: "truncate leading-5", title: accessibleTitle, children: title }),
                  preview ? /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: "truncate text-[11px] leading-4 text-subtle-foreground/75",
                      title: preview,
                      children: preview
                    }
                  ) : null
                ] }),
                hasChildren ? /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    "aria-expanded": !childrenCollapsed,
                    "aria-label": childrenCollapsed ? `Expand ${title} threads` : `Collapse ${title} threads`,
                    className: "bb-sidebar-hover-actions relative z-20 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
                    onClick: (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggleChildren();
                    },
                    children: /* @__PURE__ */ jsx(
                      Icon,
                      {
                        name: "ChevronRight",
                        className: `size-3 transition-transform duration-150 ${childrenCollapsed ? "" : "rotate-90"}`,
                        "aria-hidden": true
                      }
                    )
                  }
                ) : null
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "relative flex h-10 w-7 shrink-0 items-center justify-end max-md:pointer-coarse:h-12 max-md:pointer-coarse:w-9", children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    "data-sidebar-hover-actions-open": actionsOpen ? "true" : void 0,
                    className: "bb-sidebar-hover-actions-fade absolute inset-0 flex items-center justify-center text-subtle-foreground",
                    children: layout ? /* @__PURE__ */ jsx(
                      "span",
                      {
                        "data-sidebar-thread-trailing-indicator": "",
                        className: "inline-flex size-4 shrink-0 items-center justify-center",
                        children: /* @__PURE__ */ jsx(
                          SplitPaneMiniMap,
                          {
                            layout,
                            label: indicatorThread.indicatorLabel ? `${title} \u2014 open in split; ${indicatorThread.indicatorLabel}` : `${title} \u2014 open in split`,
                            isWorking: [
                              "working-draft",
                              "workflow",
                              "background-agent",
                              "background-command",
                              "plan-mode",
                              "goal",
                              "runtime"
                            ].includes(indicatorThread.indicator)
                          }
                        )
                      }
                    ) : indicatorThread.indicator !== "none" ? /* @__PURE__ */ jsx(
                      "span",
                      {
                        "data-sidebar-thread-trailing-indicator": "",
                        className: "inline-flex size-4 shrink-0 items-center justify-center",
                        children: /* @__PURE__ */ jsx(
                          ThreadIndicator,
                          {
                            indicator: indicatorThread.indicator,
                            label: indicatorThread.indicatorLabel
                          }
                        )
                      }
                    ) : null
                  }
                ),
                !thread.isArchived ? /* @__PURE__ */ jsx(
                  "span",
                  {
                    "data-sidebar-hover-actions-open": actionsOpen ? "true" : void 0,
                    className: "bb-sidebar-hover-actions absolute inset-0 z-10 flex items-center justify-end max-md:pointer-coarse:hidden",
                    children: /* @__PURE__ */ jsx(
                      ThreadActionsDropdown,
                      {
                        ...commonMenuProps,
                        onOpenChange: setDropdownOpen
                      }
                    )
                  }
                ) : null
              ] })
            ]
          }
        )
      ]
    }
  );
  if (thread.isArchived) return row;
  return /* @__PURE__ */ jsxs(Fragment2, { children: [
    /* @__PURE__ */ jsx(
      ThreadActionsContextMenu,
      {
        ...commonMenuProps,
        onOpenChange: setContextOpen,
        children: row
      }
    ),
    /* @__PURE__ */ jsx(
      ThreadRenameDialog,
      {
        currentTitle: title,
        open: renameOpen,
        onOpenChange: setRenameOpen,
        onRename: (nextTitle) => actions.rename(thread.id, nextTitle)
      }
    )
  ] });
}
function SidebarSection({
  children,
  collapsed,
  dropTarget,
  onDropAtEnd,
  onDragOverEnd,
  onToggle,
  label,
  threads
}) {
  const activityThread = collapsed ? groupIndicator(threads) : null;
  const id = `thread-task-group-${label.replace(/\s/g, "-")}`;
  return /* @__PURE__ */ jsxs(
    "section",
    {
      "data-sidebar-sticky-group": "",
      "aria-labelledby": id,
      className: `group/sidebar-section min-w-0 rounded-md transition-colors ${dropTarget ? "bg-sidebar-accent/60" : ""}`,
      onDragOver: onDragOverEnd,
      onDrop: onDropAtEnd,
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            "data-sidebar": "group-label",
            "data-sidebar-sticky-tier": "label",
            className: "bb-sidebar-hover-actions-row sticky top-0 z-[60] flex h-6 items-center rounded-md bg-sidebar pl-2 pr-0 text-xs font-normal leading-5 text-subtle-foreground/75 transition-colors max-md:pointer-coarse:h-9",
            children: [
              /* @__PURE__ */ jsxs("span", { className: "relative z-10 flex min-w-0 flex-1 items-center gap-1 text-left", children: [
                label === PINNED_SECTION ? null : /* @__PURE__ */ jsx(TaskStatusIcon, { status: label, className: "mr-1 size-4 shrink-0" }),
                /* @__PURE__ */ jsx("span", { id, className: "min-w-0 truncate", title: label, children: label }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    "aria-expanded": !collapsed,
                    "aria-label": collapsed ? `Expand ${label} section` : `Collapse ${label} section`,
                    className: `relative z-20 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 ${collapsed ? "" : "bb-sidebar-hover-actions"}`,
                    onClick: (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onToggle();
                    },
                    onDragStart: (event) => event.preventDefault(),
                    children: /* @__PURE__ */ jsx(
                      Icon,
                      {
                        name: "ChevronRight",
                        className: `size-3 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`,
                        "aria-hidden": true
                      }
                    )
                  }
                )
              ] }),
              activityThread ? /* @__PURE__ */ jsx("span", { className: "pointer-events-none absolute right-2 top-1/2 z-20 inline-flex -translate-y-1/2 items-center text-subtle-foreground", children: /* @__PURE__ */ jsx(
                ThreadIndicator,
                {
                  indicator: activityThread.indicator,
                  label: activityThread.indicatorLabel
                }
              ) }) : null
            ]
          }
        ),
        collapsed ? null : /* @__PURE__ */ jsx("div", { className: "mt-1", children })
      ]
    }
  );
}
function LoadingState() {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "aria-label": "Loading sidebar navigation",
      className: "space-y-1.5 px-2 pt-1",
      children: ["w-2/3", "w-1/2"].map((width) => /* @__PURE__ */ jsxs("div", { className: "flex h-7 animate-pulse items-center gap-2 rounded-md", children: [
        /* @__PURE__ */ jsx("span", { className: "size-4 shrink-0 rounded-md bg-sidebar-border/60" }),
        /* @__PURE__ */ jsx("span", { className: `h-3 ${width} rounded-sm bg-sidebar-border/50` })
      ] }, width))
    }
  );
}
function SidebarMessage({
  action,
  children,
  icon,
  isLoading = false
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mx-2 flex min-h-8 items-center gap-2 px-3 py-2 text-xs text-muted-foreground", children: [
    /* @__PURE__ */ jsx(
      Icon,
      {
        name: icon,
        className: `size-4 shrink-0 ${isLoading ? "animate-spin" : ""}`,
        "aria-hidden": true
      }
    ),
    /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1", children }),
    action ? /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "shrink-0 rounded-md px-2 py-1 text-xs text-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2",
        onClick: action.onClick,
        children: action.label
      }
    ) : null
  ] });
}
function ThreadStatusList({
  activeThreadId,
  onNavigate,
  searchQuery
}) {
  const rpc = useRpc();
  const sidebar = experimental_useSidebarThreads();
  const actions = experimental_useSidebarThreadActions();
  const connectionState = useRealtimeConnectionState();
  const [organization, setOrganization] = useState(
    null
  );
  const [previews, setPreviews] = useState(
    () => /* @__PURE__ */ new Map()
  );
  const organizationLoaded = useRef(false);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState({
    query: "",
    status: "idle",
    threads: []
  });
  const [draggingThreadId, setDraggingThreadId] = useState(null);
  const [dropBefore, setDropBefore] = useState(null);
  const [dropAfter, setDropAfter] = useState(null);
  const [dropGroup, setDropGroup] = useState(null);
  const [collapsedSections, setCollapsedSections] = usePersistentStringSet(
    COLLAPSED_STATUSES_STORAGE_KEY,
    COLLAPSIBLE_SECTION_SET
  );
  const [collapsedThreads, setCollapsedThreads] = usePersistentStringSet(
    COLLAPSED_THREADS_STORAGE_KEY
  );
  const [mutationPending, setMutationPending] = useState(false);
  const [pinnedThreadIds, setPinnedThreadIds] = useState([]);
  const wasConnected = useRef(false);
  const syncInFlight = useRef(false);
  const clearDrag = useCallback(() => {
    setDraggingThreadId(null);
    setDropBefore(null);
    setDropAfter(null);
    setDropGroup(null);
  }, []);
  const refresh = useCallback(async () => {
    try {
      const state = await rpc.call("listState", null);
      setOrganization(state);
      organizationLoaded.current = true;
      setLoadError(null);
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not load tasks.";
      if (organizationLoaded.current) setError(message);
      else setLoadError(message);
    }
  }, [rpc]);
  const refreshPreviews = useCallback(async () => {
    try {
      const result = await rpc.call("listPreviews", null);
      setPreviews(
        new Map(
          result.previews.map((preview) => [
            preview.threadId,
            preview.preview
          ])
        )
      );
    } catch {
    }
  }, [rpc]);
  useEffect(() => {
    void refresh();
    void refreshPreviews();
  }, [refresh, refreshPreviews]);
  useRealtime("state-changed", () => {
    void refresh();
  });
  useRealtime("previews-changed", () => {
    void refreshPreviews();
  });
  useEffect(() => {
    if (connectionState === "connected" && wasConnected.current) {
      void refresh();
      void refreshPreviews();
    }
    wasConnected.current = connectionState === "connected";
  }, [connectionState, refresh, refreshPreviews]);
  const taskThreads = useMemo(
    () => sidebar.threads.filter((thread) => !thread.isArchived),
    [sidebar.threads]
  );
  const explicitPinnedThreadIds = useMemo(
    () => taskThreads.filter((thread) => thread.isPinned).map((thread) => thread.id),
    [taskThreads]
  );
  useEffect(() => {
    if (explicitPinnedThreadIds.length === 0) return;
    let canceled = false;
    void rpc.call("listPinnedThreadIds", null).then(({ threadIds }) => {
      if (!canceled) setPinnedThreadIds(threadIds);
    }).catch(() => {
    });
    return () => {
      canceled = true;
    };
  }, [explicitPinnedThreadIds, rpc]);
  const unsyncedThreadIds = useMemo(() => {
    const assigned = new Set(
      (organization?.assignments ?? []).map(
        (assignment) => assignment.threadId
      )
    );
    return taskThreads.map((thread) => thread.id).filter((threadId) => !assigned.has(threadId));
  }, [organization?.assignments, taskThreads]);
  useEffect(() => {
    if (!shouldSyncThreads({
      hasOrganization: organization !== null,
      loadError,
      sidebarStatus: sidebar.status,
      syncInFlight: syncInFlight.current,
      unsyncedCount: unsyncedThreadIds.length
    })) {
      return;
    }
    syncInFlight.current = true;
    void rpc.call("syncThreads", { threadIds: taskThreads.map((thread) => thread.id) }).then((state) => {
      setOrganization(state);
      setError(null);
    }).catch((cause) => {
      setError(
        cause instanceof Error ? cause.message : "Could not save task order."
      );
    }).finally(() => {
      syncInFlight.current = false;
    });
  }, [
    loadError,
    organization,
    rpc,
    sidebar.status,
    taskThreads,
    unsyncedThreadIds.length
  ]);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  useEffect(() => {
    if (!normalizedSearch) {
      setSearch({ query: "", status: "idle", threads: [] });
      return;
    }
    let canceled = false;
    const timeout = window.setTimeout(() => {
      setSearch({ query: normalizedSearch, status: "loading", threads: [] });
      void rpc.call("searchThreads", { query: searchQuery.trim() }).then(({ threads }) => {
        if (!canceled) {
          setSearch({
            query: normalizedSearch,
            status: "ready",
            threads
          });
        }
      }).catch(() => {
        if (!canceled) {
          setSearch({
            query: normalizedSearch,
            status: "error",
            threads: []
          });
        }
      });
    }, 150);
    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [normalizedSearch, rpc, searchQuery]);
  const displayThreads = useMemo(() => {
    if (!normalizedSearch) return taskThreads;
    if (search.query !== normalizedSearch || search.status !== "ready") return [];
    const liveThreads = new Map(
      sidebar.threads.map((thread) => [thread.id, thread])
    );
    return search.threads.map(
      (thread) => liveThreads.get(thread.id) ?? archivedSearchThread(thread)
    );
  }, [normalizedSearch, search, sidebar.threads, taskThreads]);
  const pinnedState = useMemo(
    () => buildPinnedThreadState(displayThreads, pinnedThreadIds),
    [displayThreads, pinnedThreadIds]
  );
  const statusThreads = useMemo(
    () => displayThreads.filter(
      (thread) => !pinnedState.effectivePinnedThreadIds.has(thread.id)
    ),
    [displayThreads, pinnedState.effectivePinnedThreadIds]
  );
  const groups = useMemo(
    () => groupThreadsByStatus(statusThreads, organization?.assignments ?? []),
    [organization?.assignments, statusThreads]
  );
  const assignmentByThreadId = useMemo(
    () => new Map(
      (organization?.assignments ?? []).map((assignment) => [
        assignment.threadId,
        assignment
      ])
    ),
    [organization?.assignments]
  );
  const pinnedHierarchyRows = useMemo(
    () => flattenThreadHierarchy(pinnedState.pinnedThreads, collapsedThreads),
    [collapsedThreads, pinnedState.pinnedThreads]
  );
  const pinnedRootThreads = useMemo(
    () => pinnedHierarchyRows.filter(({ depth }) => depth === 0).map(({ thread }) => thread),
    [pinnedHierarchyRows]
  );
  const pinnedRootIds = useMemo(
    () => new Set(pinnedRootThreads.map((thread) => thread.id)),
    [pinnedRootThreads]
  );
  const commitMove = useCallback(
    async (threadId, status, beforeThreadId) => {
      if (mutationPending || unsyncedThreadIds.length > 0) return;
      const order = destinationOrder(
        groups[status].map((thread) => thread.id),
        threadId,
        beforeThreadId
      );
      const movedIndex = order.indexOf(threadId);
      setMutationPending(true);
      setError(null);
      try {
        const state = await rpc.call("moveThread", {
          threadId,
          taskStatus: status,
          previousThreadId: order[movedIndex - 1] ?? null,
          nextThreadId: order[movedIndex + 1] ?? null
        });
        setOrganization(state);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not move the task."
        );
        await refresh();
      } finally {
        setMutationPending(false);
        clearDrag();
      }
    },
    [clearDrag, groups, mutationPending, refresh, rpc, unsyncedThreadIds.length]
  );
  const commitPinnedMove = useCallback(
    async (threadId, beforeThreadId) => {
      if (mutationPending || !pinnedRootIds.has(threadId)) return;
      const order = destinationOrder(
        pinnedRootThreads.map((thread) => thread.id),
        threadId,
        beforeThreadId
      );
      const movedIndex = order.indexOf(threadId);
      setMutationPending(true);
      setError(null);
      try {
        const { threadIds } = await rpc.call("reorderPinnedThread", {
          threadId,
          previousThreadId: order[movedIndex - 1] ?? null,
          nextThreadId: order[movedIndex + 1] ?? null
        });
        setPinnedThreadIds(threadIds);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not reorder the pinned thread."
        );
      } finally {
        setMutationPending(false);
        clearDrag();
      }
    },
    [clearDrag, mutationPending, pinnedRootIds, pinnedRootThreads, rpc]
  );
  function toggleCollapsed(group) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }
  function toggleThreadCollapsed(threadId) {
    setCollapsedThreads((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }
  if (sidebar.status === "loading" || organization === null && loadError === null) {
    return /* @__PURE__ */ jsx(LoadingState, {});
  }
  if (sidebar.status === "error") {
    return /* @__PURE__ */ jsx(SidebarMessage, { icon: "AlertCircle", children: "Could not load threads." });
  }
  if (organization === null) {
    return /* @__PURE__ */ jsx(
      SidebarMessage,
      {
        icon: "AlertCircle",
        action: {
          label: "Retry",
          onClick: () => {
            setLoadError(null);
            void refresh();
          }
        },
        children: "Could not load tasks."
      }
    );
  }
  if (normalizedSearch && (search.query !== normalizedSearch || search.status === "loading")) {
    return /* @__PURE__ */ jsx(SidebarMessage, { icon: "Loading", isLoading: true, children: "Searching threads..." });
  }
  if (normalizedSearch && search.status === "error") {
    return /* @__PURE__ */ jsx(SidebarMessage, { icon: "AlertCircle", children: "Search failed." });
  }
  if (displayThreads.length === 0) {
    return /* @__PURE__ */ jsx(SidebarMessage, { icon: "CircleQuestion", children: normalizedSearch ? "No matching threads" : "No threads yet" });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-sidebar": "group",
      "data-sidebar-sticky-stack": "",
      "data-sidebar-sticky-density": "compact-actions",
      className: "relative flex w-full min-w-0 flex-col",
      onDragEnd: clearDrag,
      children: [
        error ? /* @__PURE__ */ jsx("div", { className: "mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive", children: error }) : null,
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          pinnedState.pinnedThreads.length > 0 ? /* @__PURE__ */ jsx(
            SidebarSection,
            {
              label: PINNED_SECTION,
              threads: pinnedState.pinnedThreads,
              collapsed: collapsedSections.has(PINNED_SECTION),
              dropTarget: dropGroup === PINNED_SECTION && dropBefore === null && dropAfter === null,
              onToggle: () => toggleCollapsed(PINNED_SECTION),
              onDragOverEnd: (event) => {
                if (!draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                  return;
                }
                event.preventDefault();
                setDropGroup(PINNED_SECTION);
                setDropBefore(null);
                setDropAfter(null);
              },
              onDropAtEnd: (event) => {
                if (!draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                  return;
                }
                event.preventDefault();
                void commitPinnedMove(draggingThreadId, null);
              },
              children: /* @__PURE__ */ jsx("ul", { children: pinnedHierarchyRows.map(
                ({ thread, depth, hasChildren, descendants }) => {
                  const rootIndex = pinnedRootThreads.findIndex(
                    (item) => item.id === thread.id
                  );
                  const isRoot = rootIndex >= 0;
                  const childrenCollapsed = collapsedThreads.has(thread.id);
                  const indicatorThread = childrenCollapsed && hasChildren ? groupIndicator([thread, ...descendants]) ?? thread : thread;
                  const taskStatus = assignmentByThreadId.get(thread.id)?.taskStatus ?? DEFAULT_THREAD_STATUS;
                  return /* @__PURE__ */ jsx(
                    ThreadRow,
                    {
                      actions,
                      active: thread.id === activeThreadId,
                      canMoveDown: isRoot && rootIndex < pinnedRootThreads.length - 1,
                      canMoveUp: isRoot && rootIndex > 0,
                      childrenCollapsed,
                      depth,
                      disabled: Boolean(normalizedSearch) || mutationPending || unsyncedThreadIds.length > 0,
                      dragging: thread.id === draggingThreadId,
                      hasChildren,
                      indicatorThread,
                      onChangeStatus: (nextStatus) => {
                        void commitMove(thread.id, nextStatus, null);
                      },
                      onDragEnd: clearDrag,
                      onDragOver: (event) => {
                        if (!isRoot || !draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                          setDropGroup(null);
                          setDropBefore(null);
                          setDropAfter(null);
                          return;
                        }
                        setDropGroup(PINNED_SECTION);
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const isAfter = event.clientY > bounds.top + bounds.height / 2;
                        if (isAfter) {
                          setDropBefore(
                            pinnedRootThreads[rootIndex + 1]?.id ?? null
                          );
                          setDropAfter(thread.id);
                        } else {
                          setDropBefore(thread.id);
                          setDropAfter(null);
                        }
                      },
                      onDragStart: (event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", thread.id);
                        setDraggingThreadId(thread.id);
                      },
                      onDrop: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isRoot || !draggingThreadId || !pinnedRootIds.has(draggingThreadId)) {
                          clearDrag();
                          return;
                        }
                        void commitPinnedMove(draggingThreadId, dropBefore);
                      },
                      onMoveDown: () => {
                        void commitPinnedMove(
                          thread.id,
                          pinnedRootThreads[rootIndex + 2]?.id ?? null
                        );
                      },
                      onMoveUp: () => {
                        void commitPinnedMove(
                          thread.id,
                          pinnedRootThreads[rootIndex - 1]?.id ?? null
                        );
                      },
                      onNavigate,
                      onToggleChildren: () => toggleThreadCollapsed(thread.id),
                      preview: previews.get(thread.id) ?? null,
                      reorderable: isRoot && !Boolean(normalizedSearch),
                      showDropAfter: dropGroup === PINNED_SECTION && dropAfter === thread.id,
                      showDropBefore: dropGroup === PINNED_SECTION && dropAfter === null && dropBefore === thread.id,
                      taskStatus,
                      thread
                    },
                    thread.id
                  );
                }
              ) })
            }
          ) : null,
          THREAD_STATUSES.map((status) => {
            const allThreads = groups[status];
            const shownThreads = allThreads;
            const idsInStatus = new Set(allThreads.map((thread) => thread.id));
            const hierarchyRows = normalizedSearch ? shownThreads.map((thread) => ({
              thread,
              depth: 0,
              hasChildren: false,
              descendants: []
            })) : flattenThreadHierarchy(shownThreads, collapsedThreads);
            const isCollapsed = collapsedSections.has(status);
            if (normalizedSearch && shownThreads.length === 0) return null;
            return /* @__PURE__ */ jsx(
              SidebarSection,
              {
                label: status,
                threads: shownThreads,
                collapsed: isCollapsed,
                dropTarget: dropGroup === status && dropBefore === null && dropAfter === null,
                onToggle: () => toggleCollapsed(status),
                onDragOverEnd: (event) => {
                  if (!draggingThreadId || pinnedRootIds.has(draggingThreadId)) {
                    return;
                  }
                  event.preventDefault();
                  setDropGroup(status);
                  setDropBefore(null);
                  setDropAfter(null);
                },
                onDropAtEnd: (event) => {
                  if (!draggingThreadId || pinnedRootIds.has(draggingThreadId)) {
                    return;
                  }
                  event.preventDefault();
                  void commitMove(draggingThreadId, status, null);
                },
                children: /* @__PURE__ */ jsx("ul", { children: hierarchyRows.map(
                  ({ thread, depth, hasChildren, descendants }) => {
                    const fullIndex = allThreads.findIndex(
                      (item) => item.id === thread.id
                    );
                    const effectiveParentId = effectiveHierarchyParentId(
                      thread,
                      idsInStatus
                    );
                    const siblings = allThreads.filter((item) => {
                      return effectiveHierarchyParentId(item, idsInStatus) === effectiveParentId;
                    });
                    const siblingIndex = siblings.findIndex(
                      (item) => item.id === thread.id
                    );
                    const childrenCollapsed = collapsedThreads.has(thread.id);
                    const indicatorThread = childrenCollapsed && hasChildren ? groupIndicator([thread, ...descendants]) ?? thread : thread;
                    return /* @__PURE__ */ jsx(
                      ThreadRow,
                      {
                        actions,
                        active: thread.id === activeThreadId,
                        canMoveDown: siblingIndex < siblings.length - 1,
                        canMoveUp: siblingIndex > 0,
                        childrenCollapsed,
                        depth,
                        disabled: Boolean(normalizedSearch) || mutationPending || unsyncedThreadIds.length > 0,
                        dragging: thread.id === draggingThreadId,
                        hasChildren,
                        indicatorThread,
                        onChangeStatus: (nextStatus) => {
                          void commitMove(thread.id, nextStatus, null);
                        },
                        onDragEnd: clearDrag,
                        onDragOver: (event) => {
                          const draggedThread = taskThreads.find(
                            (item) => item.id === draggingThreadId
                          );
                          if (draggedThread === void 0 || pinnedRootIds.has(draggedThread.id) || !canDropThreadBeside(
                            draggedThread,
                            thread,
                            idsInStatus
                          )) {
                            setDropGroup(null);
                            setDropBefore(null);
                            setDropAfter(null);
                            return;
                          }
                          setDropGroup(status);
                          const bounds = event.currentTarget.getBoundingClientRect();
                          const isAfter = event.clientY > bounds.top + bounds.height / 2;
                          if (isAfter) {
                            setDropBefore(allThreads[fullIndex + 1]?.id ?? null);
                            setDropAfter(thread.id);
                          } else {
                            setDropBefore(thread.id);
                            setDropAfter(null);
                          }
                        },
                        onDragStart: (event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", thread.id);
                          setDraggingThreadId(thread.id);
                        },
                        onDrop: (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!draggingThreadId) return;
                          const draggedThread = taskThreads.find(
                            (item) => item.id === draggingThreadId
                          );
                          if (draggedThread === void 0 || pinnedRootIds.has(draggedThread.id) || !canDropThreadBeside(
                            draggedThread,
                            thread,
                            idsInStatus
                          )) {
                            clearDrag();
                            return;
                          }
                          void commitMove(draggingThreadId, status, dropBefore);
                        },
                        onMoveDown: () => {
                          const afterNextSibling = siblings[siblingIndex + 2];
                          const before = afterNextSibling?.id ?? allThreads[allThreads.findIndex(
                            (item) => item.id === siblings[siblingIndex + 1]?.id
                          ) + 1]?.id ?? null;
                          void commitMove(thread.id, status, before);
                        },
                        onMoveUp: () => {
                          void commitMove(
                            thread.id,
                            status,
                            siblings[siblingIndex - 1]?.id ?? null
                          );
                        },
                        onNavigate,
                        onToggleChildren: () => toggleThreadCollapsed(thread.id),
                        preview: previews.get(thread.id) ?? null,
                        reorderable: !Boolean(normalizedSearch),
                        showDropAfter: dropGroup === status && dropAfter === thread.id,
                        showDropBefore: dropGroup === status && dropAfter === null && dropBefore === thread.id,
                        taskStatus: status,
                        thread
                      },
                      thread.id
                    );
                  }
                ) })
              },
              status
            );
          })
        ] })
      ]
    }
  );
}
function rpcErrorMessage(error, fallback) {
  if (typeof error === "string") return error;
  if (error !== null && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
async function setTaskStatus(pluginId, threadId, taskStatus) {
  const response = await fetch(
    `/api/v1/plugins/${encodeURIComponent(pluginId)}/rpc/setTaskStatus`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskStatus, threadId }),
      credentials: "same-origin"
    }
  );
  const envelope = await response.json();
  if (!response.ok || !envelope.ok) {
    throw new Error(
      !envelope.ok ? rpcErrorMessage(envelope.error, "Failed to update task status") : `Task status request failed (${response.status})`
    );
  }
}
var app_default = definePluginApp((app) => {
  app.slots.experimental_threadList({
    id: "thread-status",
    title: "Thread tasks",
    description: "Treat threads as manually ordered tasks grouped by task status.",
    component: ThreadStatusList
  });
  app.contentScripts.register({
    id: "task-shortcuts",
    mount({ pluginId, signal }) {
      const createKeyboardEvent = (type, init) => new KeyboardEvent(type, init);
      window.addEventListener(
        "keydown",
        (event) => {
          const taskStatus = taskStatusShortcut(event);
          if (taskStatus === null) return;
          const threadId = currentThreadId(window.location.pathname);
          if (threadId === null) return;
          event.preventDefault();
          event.stopPropagation();
          notifyNativeShortcutHandled(window, createKeyboardEvent);
          void setTaskStatus(pluginId, threadId, taskStatus).catch(
            (error) => {
              toast.error(
                rpcErrorMessage(error, "Failed to update task status")
              );
            }
          );
        },
        { capture: true, signal }
      );
    }
  });
});
export {
  app_default as default
};
