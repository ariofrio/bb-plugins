import {
  definePluginApp,
  experimental_useSidebarThreadActions,
  useRpc,
  useSettings,
  type PluginThreadHeaderActionProps,
  useBbNavigate,
} from "@get-bb/plugin-sdk/app";
import { Icon } from "@/components/ui/icon";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProjectBreadcrumb } from "./ProjectBreadcrumb";
import { SectionBreadcrumb } from "./SectionBreadcrumb";
import {
  installBreadcrumbPortal,
  navigateToProjectSettings,
} from "./header-dom";
import type { rpcContract } from "./server";

interface Trail {
  section: { id: string; name: string } | null;
  project: { id: string; name: string; isPersonal: boolean } | null;
  ancestors: Array<{ id: string; title: string }>;
}

function BreadcrumbsBridge({ threadId }: PluginThreadHeaderActionProps) {
  const threadActions = experimental_useSidebarThreadActions();
  const rpc = useRpc<typeof rpcContract>();
  const settings = useSettings();
  const navigate = useBbNavigate();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [trail, setTrail] = useState<Trail | null>(null);

  const showSection = settings.values?.showSection !== false;
  const showProject = settings.values?.showProject !== false;
  const showAncestors = settings.values?.showAncestors !== false;

  const refresh = useCallback(async () => {
    const next = await rpc
      .call("trailForThread", { threadId })
      .catch(() => null);
    if (next !== null) setTrail(next);
  }, [rpc, threadId]);

  /**
   * bb publishes no event a plugin can hear for a section, a rename, or a
   * move, so the trail is asked for again wherever it could have gone stale:
   * on mount, when the window is looked at again, and before a menu shows a
   * name. It is one call, and every crumb settles together.
   */
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const section = showSection ? (trail?.section ?? null) : null;
  const project =
    showProject && trail?.project?.isPersonal === false ? trail.project : null;
  const ancestors = showAncestors ? (trail?.ancestors ?? []) : [];
  const shouldShow =
    section !== null || project !== null || ancestors.length > 0;

  useLayoutEffect(() => {
    const marker = markerRef.current;
    if (!shouldShow || marker === null) {
      setPortalTarget(null);
      return;
    }

    const mounted = installBreadcrumbPortal(marker);
    if (mounted === null) return;
    setPortalTarget(mounted.target);
    return mounted.cleanup;
  }, [shouldShow]);

  return (
    <>
      <span ref={markerRef} hidden />
      {portalTarget === null
        ? null
        : createPortal(
            <>
              {section === null ? null : (
                <SectionBreadcrumb
                  sectionName={section.name}
                  onOpen={() => void refresh()}
                  onRename={async (name) => {
                    await rpc.call("renameSection", {
                      sectionId: section.id,
                      name,
                    });
                    await refresh();
                  }}
                  onRemove={async () => {
                    await rpc.call("removeSection", { sectionId: section.id });
                    await refresh();
                  }}
                />
              )}
              {project === null ? null : (
                <ProjectBreadcrumb
                  projectName={project.name}
                  onOpenSettings={() => {
                    navigateToProjectSettings(window, project.id);
                  }}
                  onRename={async (name) => {
                    await rpc.call("renameProject", {
                      projectId: project.id,
                      name,
                    });
                    await refresh();
                  }}
                  onRemove={async () => {
                    await rpc.call("removeProject", { projectId: project.id });
                    navigate.toCompose();
                  }}
                />
              )}
              {ancestors.map((ancestor) => (
                <span key={ancestor.id} className="contents">
                  <button
                    type="button"
                    onClick={() => threadActions.open(ancestor.id)}
                    title={ancestor.title}
                    className="relative z-50 -mx-2 inline-flex min-h-7 min-w-0 shrink-0 cursor-pointer items-center rounded-md px-2 text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [app-region:no-drag] [-webkit-app-region:no-drag]"
                  >
                    <span className="max-w-48 truncate">{ancestor.title}</span>
                  </button>
                  <Icon
                    name="ChevronRight"
                    className="size-3.5 shrink-0 text-subtle-foreground"
                    aria-hidden="true"
                  />
                </span>
              ))}
            </>,
            portalTarget,
          )}
    </>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "project-breadcrumb",
    title: "Breadcrumbs",
    component: BreadcrumbsBridge,
  });
});
