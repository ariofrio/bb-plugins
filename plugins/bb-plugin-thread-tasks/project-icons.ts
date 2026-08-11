import type { IconSvgElement } from "@hugeicons/react";

/**
 * Project icons come from the Project icons plugin, over its RPC. The sidebar
 * degrades to no icons when that plugin is not installed, so this never
 * throws — a missing neighbour is a normal state, not an error.
 */
const PROJECT_ICONS_PLUGIN_ID = "project-icons";
const PERSONAL_PROJECT_ID = "proj_personal";

export interface ProjectIconView {
  glyph: IconSvgElement;
  colorClass: string;
}

interface StoredProjectIcon {
  projectId: string;
  icon: string;
  color: string | null;
  glyph: IconSvgElement;
}

interface ProjectIconsResponse {
  icons: StoredProjectIcon[];
  defaults: { project: IconSvgElement; personal: IconSvgElement };
}

/** Mirrors the palette the Project icons plugin writes. */
const COLOR_CLASSES: Record<string, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  green: "text-green-500",
  teal: "text-teal-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
};

export function buildProjectIconMap(
  response: ProjectIconsResponse,
  projectIds: readonly string[],
): Map<string, ProjectIconView> {
  const byProject = new Map<string, ProjectIconView>();
  for (const projectId of projectIds) {
    byProject.set(projectId, {
      glyph:
        projectId === PERSONAL_PROJECT_ID
          ? response.defaults.personal
          : response.defaults.project,
      colorClass: "",
    });
  }
  for (const icon of response.icons) {
    byProject.set(icon.projectId, {
      glyph: icon.glyph,
      colorClass: icon.color === null ? "" : (COLOR_CLASSES[icon.color] ?? ""),
    });
  }
  return byProject;
}

export async function fetchProjectIcons(
  projectIds: readonly string[],
): Promise<Map<string, ProjectIconView>> {
  try {
    const response = await fetch(
      `/api/v1/plugins/${PROJECT_ICONS_PLUGIN_ID}/rpc/listProjectIcons`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
        credentials: "same-origin",
      },
    );
    if (!response.ok) return new Map();
    const envelope = (await response.json()) as
      | { ok: true; result: ProjectIconsResponse }
      | { ok: false };
    if (!envelope.ok) return new Map();
    return buildProjectIconMap(envelope.result, projectIds);
  } catch {
    return new Map();
  }
}
