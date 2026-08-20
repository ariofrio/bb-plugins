import {
  definePluginApp,
  experimental_useSidebarThreads,
  experimental_useSidebarThreadActions,
  useRealtime,
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
import { ancestorsOf } from "./trail";

function BreadcrumbsBridge({ threadId, projectId }: PluginThreadHeaderActionProps) {
  const { projects, threads } = experimental_useSidebarThreads();
  const threadActions = experimental_useSidebarThreadActions();
  const rpc = useRpc<typeof rpcContract>();
  const settings = useSettings();
  const navigate = useBbNavigate();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [section, setSection] = useState<{
    sectionId: string | null;
    sectionName: string | null;
  } | null>(null);

  const project = projects.find((candidate) => candidate.id === projectId);

  const showSection = settings.values?.showSection !== false;
  const showProject = settings.values?.showProject !== false;
  const showAncestors = settings.values?.showAncestors !== false;

  const refreshSection = useCallback(async () => {
    const next = await rpc
      .call("sectionForThread", { threadId })
      .catch(() => null);
    if (next !== null) setSection(next);
  }, [rpc, threadId]);

  const sectionId = section?.sectionId ?? null;
  const sectionName = section?.sectionName ?? null;

  /**
   * bb publishes nothing when a section is created, renamed, or removed, so
   * the crumb asks again wherever it could have gone stale: on mount, when the
   * window is looked at again, and before the menu shows it.
   */
  useEffect(() => {
    if (!showSection) return;
    void refreshSection();
    const onFocus = () => void refreshSection();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshSection, showSection]);

  // Catches the thread being moved into another section from anywhere.
  useRealtime("thread:changed", () => {
    if (showSection) void refreshSection();
  });

  const ancestors = showAncestors ? ancestorsOf(threads, threadId) : [];
  const hasSection = showSection && sectionId !== null && sectionName !== null;
  const hasProject =
    showProject && project !== undefined && !project.isPersonal;
  const shouldShow = hasSection || hasProject || ancestors.length > 0;

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

  if (portalTarget === null) return <span ref={markerRef} hidden />;

  return (
    <>
      <span ref={markerRef} hidden />
      {createPortal(
        <>
          {hasSection ? (
            <SectionBreadcrumb
              sectionName={sectionName}
              onOpen={() => void refreshSection()}
              onRename={async (name) => {
                await rpc.call("renameSection", { sectionId, name });
                await refreshSection();
              }}
              onRemove={async () => {
                await rpc.call("removeSection", { sectionId });
                await refreshSection();
              }}
            />
          ) : null}
          {hasProject ? (
            <ProjectBreadcrumb
              projectName={project.name}
              onOpenSettings={() => {
                navigateToProjectSettings(window, project.id);
              }}
              onRename={async (name) => {
                await rpc.call("renameProject", { projectId: project.id, name });
              }}
              onRemove={async () => {
                await rpc.call("removeProject", { projectId: project.id });
                navigate.toCompose();
              }}
            />
          ) : null}
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
