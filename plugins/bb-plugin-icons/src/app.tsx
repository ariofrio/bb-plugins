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
import { announceIconsChanged } from "./broadcast";
import { installIconPortal } from "./header-dom";
import { IconPicker, type CatalogIcon } from "./IconPicker";
import { iconColorStyle } from "./icon-colors";
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

function IconHeaderAction({ projectId }: PluginThreadHeaderActionProps) {
  const owner: IconOwner = { kind: "project", id: projectId };
  const rpc = useRpc<typeof rpcContract>();
  const settings = useSettings();
  const sidebar = experimental_useSidebarThreads();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [icons, setIcons] = useState<readonly IconView[]>([]);
  const [defaults, setDefaults] = useState<IconDefaults | null>(null);
  const [picking, setPicking] = useState(false);
  const [catalog, setCatalog] = useState<readonly CatalogIcon[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const refresh = useCallback(async () => {
    const state = await rpc.call("listIcons", null);
    setIcons(state.icons);
    setDefaults(state.defaults);
  }, [rpc]);

  // The catalog is big, so it is fetched the first time the picker opens.
  useEffect(() => {
    if (!picking || catalog.length > 0 || loadingCatalog) return;
    setLoadingCatalog(true);
    void rpc
      .call("listIconCatalog", null)
      .then(({ icons: entries }) => setCatalog(entries))
      .finally(() => setLoadingCatalog(false));
  }, [catalog.length, loadingCatalog, picking, rpc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  // Other clients report through this plugin's realtime channel; pass it on so
  // plugins that cannot join that channel still see the change.
  useRealtime("icons-changed", () => {
    void refresh();
    announceIconsChanged();
  });

  // Undefined while settings load: the icon has always been here, so it
  // stays until the user is known to have turned it off, rather than blinking
  // in on every thread open.
  const showInHeader = settings.values?.showInThreadHeader !== false;

  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (marker === null || !showInHeader) return;
    const mount = installIconPortal(marker);
    setTarget(mount?.target ?? null);
    return () => {
      setTarget(null);
      mount?.cleanup();
    };
  }, [projectId, showInHeader]);

  const chosen = icons.find(
    (item) => item.kind === owner.kind && item.id === owner.id,
  );
  const icon = chosen?.icon ?? defaultIcon(owner);
  const color = chosen?.color ?? null;
  const glyph = chosen?.glyph ?? defaultGlyph(owner, defaults);
  const editable = isEditable(owner);
  const ownerName =
    sidebar.projects.find((project) => project.id === projectId)?.name ??
    "this project";

  // Picking an icon and then a color lands two updates in one tick, so the
  // pending choice is tracked in a ref rather than read back from state.
  const pendingRef = useRef({ icon, color });
  useEffect(() => {
    pendingRef.current = { icon, color };
  }, [color, icon]);

  const apply = (next: { icon?: string; color?: IconColor | null }) => {
    const nextIcon = next.icon ?? pendingRef.current.icon;
    const nextColor =
      next.color === undefined ? pendingRef.current.color : next.color;
    pendingRef.current = { icon: nextIcon, color: nextColor };
    const nextGlyph =
      catalog.find((entry) => entry.name === nextIcon)?.glyph ?? glyph;
    setIcons((current) => [
      ...current.filter(
        (item) => !(item.kind === owner.kind && item.id === owner.id),
      ),
      { ...owner, icon: nextIcon, color: nextColor, glyph: nextGlyph ?? [] },
    ]);
    announceIconsChanged();
    void rpc
      .call("setIcon", { ...owner, icon: nextIcon, color: nextColor })
      .catch(() => void refresh());
  };

  const reset = () => {
    pendingRef.current = { icon: defaultIcon(owner), color: null };
    setIcons((current) =>
      current.filter(
        (item) => !(item.kind === owner.kind && item.id === owner.id),
      ),
    );
    announceIconsChanged();
    void rpc.call("clearIcon", owner).catch(() => void refresh());
  };

  const control = editable ? (
    <button
      type="button"
      aria-label={`Icon for ${ownerName}`}
      title="Change project icon"
      // The desktop header is a window drag region, so an interactive control
      // inside it has to opt out or Electron swallows the click.
      className="relative z-50 -ml-0.5 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground [app-region:no-drag] [-webkit-app-region:no-drag]"
    >
      <IconGlyph name={icon} glyph={glyph} color={color} />
    </button>
  ) : (
    <span className="-ml-0.5 flex size-6 items-center justify-center text-muted-foreground">
      <IconGlyph name={icon} glyph={glyph} color={color} />
    </span>
  );

  return (
    <>
      <span ref={markerRef} className="hidden" />
      {target === null
        ? null
        : createPortal(
            editable ? (
              <IconPicker
                catalog={catalog}
                loading={loadingCatalog}
                open={picking}
                onOpenChange={setPicking}
                ownerName={ownerName}
                icon={icon}
                defaultIcon={defaultIcon(owner)}
                color={color}
                onPick={(next) => apply({ icon: next })}
                onPickColor={(next) => apply({ color: next })}
                onReset={reset}
                trigger={control}
              />
            ) : (
              control
            ),
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

      const draw = (anchors: SidebarAnchor[]) => {
        root.render(<SidebarIcons anchors={anchors} rpc={rpc} />);
      };
      draw([]);
      const stop = observeSidebarIconAnchors(draw);

      const dispose = () => {
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
