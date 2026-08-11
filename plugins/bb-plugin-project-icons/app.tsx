import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  definePluginApp,
  experimental_useSidebarThreads,
  useRealtime,
  useRpc,
  type PluginThreadHeaderActionProps,
} from "@bb/plugin-sdk/app";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { announceProjectIconsChanged } from "./broadcast";
import { installProjectIconPortal } from "./header-dom";
import { IconPicker, type CatalogIcon } from "./IconPicker";
import { projectIconColorStyle } from "./project-icon-colors";
import type { rpcContract } from "./server";
import {
  PERSONAL_PROJECT_ID,
  defaultProjectIcon,
  isEditableProject,
  type ProjectIcon,
  type ProjectIconColor,
} from "./store";

interface StoredIcon extends ProjectIcon {
  glyph: IconSvgElement;
}

interface IconDefaults {
  project: IconSvgElement;
  personal: IconSvgElement;
}

function ProjectIconGlyph({
  name,
  glyph,
  color,
}: {
  name: string;
  glyph: IconSvgElement | undefined;
  color: ProjectIcon["color"];
}) {
  if (glyph === undefined) return null;
  return (
    <HugeiconsIcon
      icon={glyph}
      className="size-4 shrink-0"
      style={projectIconColorStyle(color)}
      data-project-icon={name}
      aria-hidden
    />
  );
}

function ProjectIconHeaderAction({ projectId }: PluginThreadHeaderActionProps) {
  const rpc = useRpc<typeof rpcContract>();
  const sidebar = experimental_useSidebarThreads();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [icons, setIcons] = useState<readonly StoredIcon[]>([]);
  const [defaults, setDefaults] = useState<IconDefaults | null>(null);
  const [picking, setPicking] = useState(false);
  const [catalog, setCatalog] = useState<readonly CatalogIcon[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const refresh = useCallback(async () => {
    const state = await rpc.call("listProjectIcons", null);
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
    announceProjectIconsChanged();
  });

  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (marker === null) return;
    const mount = installProjectIconPortal(marker);
    setTarget(mount?.target ?? null);
    return () => {
      setTarget(null);
      mount?.cleanup();
    };
  }, [projectId]);

  const chosen = icons.find((item) => item.projectId === projectId);
  const icon = chosen?.icon ?? defaultProjectIcon(projectId);
  const color = chosen?.color ?? null;
  const glyph =
    chosen?.glyph ??
    (projectId === PERSONAL_PROJECT_ID ? defaults?.personal : defaults?.project);
  const editable = isEditableProject(projectId);
  const projectName =
    sidebar.projects.find((project) => project.id === projectId)?.name ??
    "this project";

  // Picking an icon and then a color lands two updates in one tick, so the
  // pending choice is tracked in a ref rather than read back from state.
  const pendingRef = useRef({ icon, color });
  useEffect(() => {
    pendingRef.current = { icon, color };
  }, [color, icon]);

  const apply = (next: { icon?: string; color?: ProjectIconColor | null }) => {
    const nextIcon = next.icon ?? pendingRef.current.icon;
    const nextColor =
      next.color === undefined ? pendingRef.current.color : next.color;
    pendingRef.current = { icon: nextIcon, color: nextColor };
    const nextGlyph =
      catalog.find((entry) => entry.name === nextIcon)?.glyph ?? glyph;
    setIcons((current) => [
      ...current.filter((item) => item.projectId !== projectId),
      { projectId, icon: nextIcon, color: nextColor, glyph: nextGlyph ?? [] },
    ]);
    announceProjectIconsChanged();
    void rpc
      .call("setProjectIcon", { projectId, icon: nextIcon, color: nextColor })
      .catch(() => void refresh());
  };

  const reset = () => {
    pendingRef.current = {
      icon: defaultProjectIcon(projectId),
      color: null,
    };
    setIcons((current) => current.filter((item) => item.projectId !== projectId));
    setPicking(false);
    announceProjectIconsChanged();
    void rpc.call("clearProjectIcon", { projectId }).catch(() => void refresh());
  };

  const control = editable ? (
    <button
      type="button"
      aria-label={`Icon for ${projectName}`}
      title="Change project icon"
      // The desktop header is a window drag region, so an interactive control
      // inside it has to opt out or Electron swallows the click.
      className="relative z-50 -ml-0.5 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground [app-region:no-drag] [-webkit-app-region:no-drag]"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setPicking(true);
      }}
    >
      <ProjectIconGlyph name={icon} glyph={glyph} color={color} />
    </button>
  ) : (
    <span className="-ml-0.5 flex size-6 items-center justify-center text-muted-foreground">
      <ProjectIconGlyph name={icon} glyph={glyph} color={color} />
    </span>
  );

  return (
    <>
      <span ref={markerRef} className="hidden" />
      {target === null ? null : createPortal(control, target)}
      {editable ? (
        <IconPicker
          catalog={catalog}
          loading={loadingCatalog}
          open={picking}
          onOpenChange={setPicking}
          projectName={projectName}
          icon={icon}
          color={color}
          onPick={(next) => apply({ icon: next })}
          onPickColor={(next) => apply({ color: next })}
          onReset={reset}
        />
      ) : null}
    </>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "project-icon",
    title: "Project icon",
    component: ProjectIconHeaderAction,
  });
});
