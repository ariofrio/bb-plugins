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
import { createRoot, type Root } from "react-dom/client";
import { ProjectBreadcrumb } from "./ProjectBreadcrumb";
import { SectionBreadcrumb } from "./SectionBreadcrumb";
import {
  installBreadcrumbPortal,
  navigateToProjectSettings,
} from "./header-dom";
import { afterPluginFrame } from "./after-plugin-frame";
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

  /**
   * The crumbs render in a root of their own, scheduled out of the call bb is
   * watching.
   *
   * bb guards its React tree: while any plugin is attributed on the stack it
   * refuses to put a React-owned node under a container React does not own.
   * Portaling from bb's own root put these crumbs in exactly that position —
   * a commit begun by another plugin would carry them into the block, and bb
   * would report that the *other* plugin had moved a node out of React's tree.
   * A separate root shares no commit with anyone else, and the timeout leaves
   * bb's stack before rendering.
   */
  const rootRef = useRef<Root | null>(null);
  useEffect(() => {
    if (portalTarget === null) return;
    let root = rootRef.current;
    return afterPluginFrame(() => {
      root ??= createRoot(portalTarget);
      rootRef.current = root;
      root.render(
        <Crumbs
          section={section}
          project={project}
          ancestors={ancestors}
          refresh={refresh}
          rpc={rpc}
          navigate={navigate}
          threadActions={threadActions}
        />,
      );
    });
  }, [
    ancestors,
    navigate,
    portalTarget,
    project,
    refresh,
    rpc,
    section,
    threadActions,
  ]);

  useEffect(
    () => () => {
      const root = rootRef.current;
      rootRef.current = null;
      // Unmounting during a commit is what React warns about, so it waits.
      if (root !== null) afterPluginFrame(() => root.unmount());
    },
    [],
  );

  return <span ref={markerRef} hidden />;
}

interface CrumbsProps {
  section: { id: string; name: string } | null;
  project: { id: string; name: string; isPersonal: boolean } | null;
  ancestors: Array<{ id: string; title: string }>;
  refresh: () => Promise<void>;
  rpc: ReturnType<typeof useRpc<typeof rpcContract>>;
  navigate: ReturnType<typeof useBbNavigate>;
  threadActions: ReturnType<typeof experimental_useSidebarThreadActions>;
}

function Crumbs({ section, project, ancestors, refresh, rpc, navigate, threadActions }: CrumbsProps) {
  return (
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
