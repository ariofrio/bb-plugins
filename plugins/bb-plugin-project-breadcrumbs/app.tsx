import {
  definePluginApp,
  experimental_useSidebarThreads,
  type PluginThreadHeaderActionProps,
  useBbNavigate,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProjectBreadcrumb } from "./ProjectBreadcrumb";
import {
  installBreadcrumbPortal,
  navigateToProjectSettings,
} from "./header-dom";
import type { rpcContract } from "./server";

function ProjectBreadcrumbBridge({
  projectId,
}: PluginThreadHeaderActionProps) {
  const { projects } = experimental_useSidebarThreads();
  const rpc = useRpc<typeof rpcContract>();
  const navigate = useBbNavigate();
  const project = projects.find((candidate) => candidate.id === projectId);
  const markerRef = useRef<HTMLSpanElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const shouldShow = project !== undefined && !project.isPersonal;

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
      {portalTarget !== null && project !== undefined
          ? createPortal(
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
              }}
              onRemove={async () => {
                await rpc.call("removeProject", { projectId: project.id });
                navigate.toCompose();
              }}
            />,
            portalTarget,
          )
        : null}
    </>
  );
}

export default definePluginApp((app) => {
  app.slots.experimental_threadHeaderAction({
    id: "project-breadcrumb",
    title: "Project breadcrumb",
    component: ProjectBreadcrumbBridge,
  });
});
