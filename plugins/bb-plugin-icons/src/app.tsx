import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  definePluginApp,
  experimental_useSidebarThreads,
  useRealtime,
  useRpc,
  useSettings,
  type PluginThreadHeaderActionProps,
} from "@get-bb/plugin-sdk/app";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterPluginFrame } from "./after-plugin-frame";
import { announceIconsChanged } from "./broadcast";
import { installIconPortal } from "./header-dom";
import { IconPicker, type CatalogIcon } from "./IconPicker";
import { iconColorStyle } from "./icon-colors";
import { observeCrumbAnchors, type CrumbAnchor } from "./crumb-anchors";
import { threadIconOwner } from "./thread-owner";
import { iconsRpc } from "./icons-client";
import type { rpcContract } from "./server";
import { SidebarIcons } from "./SidebarIcons";
import { observeSidebarIconAnchors, type SidebarAnchor } from "./sidebar-dom";
import {
  defaultIcon,
  isEditable,
  type IconColor,
  type IconOwner,
  type StoredIcon,
} from "./store";

interface IconView extends StoredIcon {
  glyph: IconSvgElement;
}

interface IconDefaults {
  project: IconSvgElement;
  personal: IconSvgElement;
  section: IconSvgElement;
}

function defaultGlyph(
  owner: IconOwner,
  defaults: IconDefaults | null,
): IconSvgElement | undefined {
  if (defaults === null) return undefined;
  if (owner.kind === "section") return defaults.section;
  return defaultIcon(owner) === "bubble-chat"
    ? defaults.personal
    : defaults.project;
}

function IconGlyph({
  name,
  glyph,
  color,
}: {
  name: string;
  glyph: IconSvgElement | undefined;
  color: IconColor | null;
}) {
  if (glyph === undefined) return null;
  return (
    <HugeiconsIcon
      icon={glyph}
      className="size-4 shrink-0"
      style={iconColorStyle(color)}
      data-icon={name}
      aria-hidden
    />
  );
}

/**
 * One owner's icon: the button, and the picker it opens.
 *
 * Parameterized by owner rather than fixed to the thread's project, because a
 * header can now show two — a section's and a project's, one before each of
 * the Breadcrumbs plugin's crumbs. It draws no placement of its own; where it
 * lands is the caller's business.
 */
function HeaderIcon({
  owner,
  ownerName,
  icons,
  defaults,
  catalog,
  loadingCatalog,
  onWanted,
  onApply,
  onReset,
}: {
  owner: IconOwner;
  ownerName: string;
  icons: readonly IconView[];
  defaults: IconDefaults | null;
  catalog: readonly CatalogIcon[];
  loadingCatalog: boolean;
  onWanted(): void;
  onApply(owner: IconOwner, next: { icon?: string; color?: IconColor | null }): void;
  onReset(owner: IconOwner): void;
}) {
  const [picking, setPicking] = useState(false);
  const chosen = icons.find(
    (item) => item.kind === owner.kind && item.id === owner.id,
  );
  const icon = chosen?.icon ?? defaultIcon(owner);
  const color = chosen?.color ?? null;
  const glyph = chosen?.glyph ?? defaultGlyph(owner, defaults);
  const editable = isEditable(owner);

  const control = editable ? (
    <button
      type="button"
      aria-label={`Icon for ${ownerName}`}
      title={owner.kind === "section" ? "Change section icon" : "Change project icon"}
      onPointerEnter={onWanted}
      onFocus={onWanted}
      // The desktop header is a window drag region, so an interactive control
      // inside it has to opt out or Electron swallows the click.
      //
      // No color of its own, like the sidebar's: the icon then reads at the
      // same weight as the thread title it sits beside, which is where bb puts
      // its own header controls too. The hover and open states stay, so the
      // icon still lifts if it ever inherits something dimmer.
      className="relative z-50 -ml-0.5 flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 hover:duration-0 hover:bg-state-hover hover:text-foreground data-[state=open]:bg-state-active data-[state=open]:text-foreground [app-region:no-drag] [-webkit-app-region:no-drag]"
    >
      <IconGlyph name={icon} glyph={glyph} color={color} />
    </button>
  ) : (
    <span className="-ml-0.5 flex size-6 items-center justify-center">
      <IconGlyph name={icon} glyph={glyph} color={color} />
    </span>
  );

  if (!editable) return control;
  return (
    <IconPicker
      catalog={catalog}
      loading={loadingCatalog}
      open={picking}
      onOpenChange={(next) => {
        setPicking(next);
        if (next) onWanted();
      }}
      ownerName={ownerName}
      icon={icon}
      defaultIcon={defaultIcon(owner)}
      color={color}
      onPick={(next) => onApply(owner, { icon: next })}
      onPickColor={(next) => onApply(owner, { color: next })}
      onReset={() => onReset(owner)}
      trigger={control}
    />
  );
}

function IconHeaderAction({ threadId, projectId }: PluginThreadHeaderActionProps) {
  const rpc = useRpc<typeof rpcContract>();
  const settings = useSettings();
  const sidebar = experimental_useSidebarThreads();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [icons, setIcons] = useState<readonly IconView[]>([]);
  const [defaults, setDefaults] = useState<IconDefaults | null>(null);
  const [catalog, setCatalog] = useState<readonly CatalogIcon[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [anchors, setAnchors] = useState<readonly CrumbAnchor[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  /**
   * Set when the pointer reaches the icon, before any click.
   *
   * The catalog is 2,532 icons and deliberately not in the bundle, so opening
   * cold means the popover arrives, then its categories and grid land a beat
   * later — one movement answered by a second. Fetching on approach keeps the
   * bundle small and still has the picker whole by the time it opens.
   */
  const [wanted, setWanted] = useState(false);

  const refresh = useCallback(async () => {
    const state = await rpc.call("listIcons", null);
    setIcons(state.icons);
    setDefaults(state.defaults);
  }, [rpc]);

  // The catalog is big, so it is fetched the first time the picker opens.
  useEffect(() => {
    if (!wanted || catalog.length > 0 || loadingCatalog) return;
    setLoadingCatalog(true);
    void rpc
      .call("listIconCatalog", null)
      .then(({ icons: entries }) => setCatalog(entries))
      .finally(() => setLoadingCatalog(false));
  }, [catalog.length, loadingCatalog, rpc, wanted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  // Other clients report through this plugin's realtime channel; pass it on so
  // plugins that cannot join that channel still see the change.
  useRealtime("icons-changed", () => {
    void refresh();
    announceIconsChanged();
  });

  // Asked of bb rather than the sidebar's live view, which can still be empty
  // while a header is up. Only the lone icon needs it: an anchor already says
  // whose icon belongs in it.
  useEffect(() => {
    let canceled = false;
    void rpc
      .call("sectionForThread", { threadId })
      .then((answer) => {
        if (!canceled) setSectionId(answer.sectionId);
      })
      .catch(() => undefined);
    return () => {
      canceled = true;
    };
  }, [rpc, threadId]);

  // Undefined while settings load: the icon has always been here, so it
  // stays until the user is known to have turned it off, rather than blinking
  // in on every thread open.
  const showInHeader = settings.values?.showInThreadHeader !== false;

  /**
   * The Breadcrumbs plugin leaves a marked, empty span beside each crumb it
   * draws. Where they exist the icons belong in them, one per crumb; where
   * they do not — that plugin absent, or every crumb turned off — the header
   * gets a single icon of its own instead.
   */
  useEffect(() => {
    if (!showInHeader) return;
    return observeCrumbAnchors(setAnchors);
  }, [showInHeader]);

  const lone = anchors.length === 0;
  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (marker === null || !showInHeader || !lone) {
      setTarget(null);
      return;
    }
    const mount = installIconPortal(marker);
    setTarget(mount?.target ?? null);
    return () => {
      setTarget(null);
      mount?.cleanup();
    };
  }, [lone, projectId, showInHeader]);

  const nameOf = useCallback(
    (owner: IconOwner) =>
      owner.kind === "project"
        ? (sidebar.projects.find((project) => project.id === owner.id)?.name ??
          "this project")
        : "this section",
    [sidebar.projects],
  );

  const apply = useCallback(
    (owner: IconOwner, next: { icon?: string; color?: IconColor | null }) => {
      setIcons((current) => {
        const chosen = current.find(
          (item) => item.kind === owner.kind && item.id === owner.id,
        );
        const nextIcon = next.icon ?? chosen?.icon ?? defaultIcon(owner);
        const nextColor =
          next.color === undefined ? (chosen?.color ?? null) : next.color;
        const nextGlyph =
          catalog.find((entry) => entry.name === nextIcon)?.glyph ??
          chosen?.glyph ??
          defaultGlyph(owner, defaults) ??
          [];
        void rpc
          .call("setIcon", { ...owner, icon: nextIcon, color: nextColor })
          .catch(() => void refresh());
        return [
          ...current.filter(
            (item) => !(item.kind === owner.kind && item.id === owner.id),
          ),
          { ...owner, icon: nextIcon, color: nextColor, glyph: nextGlyph },
        ];
      });
      announceIconsChanged();
    },
    [catalog, defaults, refresh, rpc],
  );

  const reset = useCallback(
    (owner: IconOwner) => {
      setIcons((current) =>
        current.filter(
          (item) => !(item.kind === owner.kind && item.id === owner.id),
        ),
      );
      announceIconsChanged();
      void rpc.call("clearIcon", owner).catch(() => void refresh());
    },
    [refresh, rpc],
  );

  const shared = {
    icons,
    defaults,
    catalog,
    loadingCatalog,
    onWanted: () => setWanted(true),
    onApply: apply,
    onReset: reset,
  };

  if (!showInHeader) return <span ref={markerRef} className="hidden" />;

  return (
    <>
      <span ref={markerRef} className="hidden" />
      {anchors.map((anchor) =>
        createPortal(
          <HeaderIcon
            owner={anchor.owner}
            ownerName={nameOf(anchor.owner)}
            {...shared}
          />,
          anchor.element,
          `${anchor.owner.kind}:${anchor.owner.id}`,
        ),
      )}
      {target === null || !lone
        ? null
        : createPortal(
            <HeaderIcon
              owner={threadIconOwner({ sectionId, projectId }, icons)}
              ownerName={nameOf(threadIconOwner({ sectionId, projectId }, icons))}
              {...shared}
            />,
            target,
          )}
    </>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "project-icon",
    title: "Project icon",
    component: IconHeaderAction,
  });

  // bb has no always-mounted React slot, and a thread-header action only
  // exists on a thread route, so the sidebar half runs as a content script.
  // Nothing from the SDK reaches here — no useRpc, no useSettings — which is
  // why this half talks to its own backend over fetch.
  app.contentScripts.register({
    id: "sidebar-icons",
    async mount({ pluginId, signal }) {
      const rpcEarly = iconsRpc(pluginId);
      // Asked before a single node is placed: an anchor left in bb's sidebar
      // would space the group label out even with nothing drawn in it. bb
      // never applies a settings edit without a reload, so one read holds.
      const placements = await rpcEarly.listPlacements();
      if (placements?.showInSidebar === false || signal.aborted) return;

      const host = document.createElement("div");
      host.style.display = "none";
      document.body.append(host);
      const root = createRoot(host);
      const rpc = rpcEarly;

      /**
       * Rendering is pushed out of the call bb is watching.
       *
       * bb guards its own React tree: while a plugin's code is on the stack it
       * blocks any React-owned node from being moved under a parent React does
       * not own. A render committed straight from the observer lands inside
       * that window and takes every plugin's portal down with it — the
       * Breadcrumbs plugin loses its crumbs and bb warns that "icons" tried to
       * move a node out of React's tree. A timeout leaves the window first.
       */
      let cancel: (() => void) | undefined;
      let pending: SidebarAnchor[] = [];
      const draw = (anchors: SidebarAnchor[]) => {
        pending = anchors;
        if (cancel !== undefined) return;
        cancel = afterPluginFrame(() => {
          cancel = undefined;
          root.render(<SidebarIcons anchors={pending} rpc={rpc} />);
        });
      };
      draw([]);
      const stop = observeSidebarIconAnchors(draw);

      const dispose = () => {
        cancel?.();
        // React owns nodes inside bb's sidebar, so it unmounts before the
        // anchors holding them are taken back out.
        root.unmount();
        stop();
        host.remove();
      };
      signal.addEventListener("abort", dispose, { once: true });
      return dispose;
    },
  });
});
