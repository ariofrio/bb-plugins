import { HugeiconsIcon } from "@hugeicons/react";
import {
  definePluginApp,
  useRealtime,
  useRpc,
  type PluginThreadHeaderActionProps,
} from "@bb/plugin-sdk/app";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CATALOG_ICONS } from "./icon-catalog.generated";
import { installProjectIconPortal } from "./header-dom";
import { projectIconColorClass } from "./project-icon-colors";
import type { rpcContract } from "./server";
import { defaultProjectIcon, type ProjectIcon } from "./store";

function ProjectIconGlyph({
  icon,
  color,
  className,
}: {
  icon: string;
  color: ProjectIcon["color"];
  className?: string;
}) {
  const element = CATALOG_ICONS[icon] ?? CATALOG_ICONS["folder-01"];
  if (element === undefined) return null;
  return (
    <HugeiconsIcon
      icon={element}
      className={`size-4 shrink-0 ${projectIconColorClass(color)} ${className ?? ""}`}
      data-project-icon={icon}
      aria-hidden
    />
  );
}

function ProjectIconHeaderAction({ projectId }: PluginThreadHeaderActionProps) {
  const rpc = useRpc<typeof rpcContract>();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [icons, setIcons] = useState<readonly ProjectIcon[]>([]);

  const refresh = useCallback(async () => {
    const { icons: next } = await rpc.call("listProjectIcons", null);
    setIcons(next);
  }, [rpc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useRealtime("icons-changed", () => void refresh());

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
  const glyph = (
    <ProjectIconGlyph
      icon={chosen?.icon ?? defaultProjectIcon(projectId)}
      color={chosen?.color ?? null}
    />
  );

  return (
    <>
      <span ref={markerRef} className="hidden" />
      {target === null ? null : createPortal(glyph, target)}
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
