import type { IconSvgElement } from "@hugeicons/react";

/**
 * Project icons come from the Project icons plugin, over its RPC. The sidebar
 * degrades to no icons when that plugin is not installed, so this never
 * throws — a missing neighbour is a normal state, not an error.
 */
const PROJECT_ICONS_PLUGIN_ID = "project-icons";
const PERSONAL_PROJECT_ID = "proj_personal";
/**
 * The Project icons plugin announces edits here. A plugin cannot join another
 * plugin's realtime channel, and both run in the same document, so a broadcast
 * channel carries the change: instantly within a window, and to other windows
 * of the same client too.
 */
export const PROJECT_ICONS_CHANNEL = "bb.project-icons";

export interface ProjectIconView {
  name: string;
  glyph: IconSvgElement;
  /** Null means the icon inherits the row's text color. */
  color: string | null;
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

/**
 * Mirrors the hue anchors and mix the Project icons plugin uses, so a color
 * reads the same here as it does in the header. A flat palette cannot stay
 * legible across bb's themes, so the hue is mixed into the theme's foreground.
 */
const HUES: Record<string, string> = {
  red: "oklch(0.637 0.237 25.331)",
  orange: "oklch(0.705 0.213 47.604)",
  yellow: "oklch(0.795 0.184 86.047)",
  green: "oklch(0.723 0.219 149.579)",
  teal: "oklch(0.704 0.14 182.503)",
  blue: "oklch(0.623 0.214 259.815)",
  purple: "oklch(0.627 0.265 303.9)",
  pink: "oklch(0.656 0.241 354.308)",
};

function iconColor(color: string | null): string | null {
  if (color === null) return null;
  const hue = HUES[color];
  return hue === undefined
    ? null
    : `color-mix(in oklch, ${hue} 45%, var(--foreground))`;
}

export function buildProjectIconMap(
  response: ProjectIconsResponse,
  projectIds: readonly string[],
): Map<string, ProjectIconView> {
  const byProject = new Map<string, ProjectIconView>();
  for (const projectId of projectIds) {
    const personal = projectId === PERSONAL_PROJECT_ID;
    byProject.set(projectId, {
      name: personal ? "bubble-chat" : "folder-01",
      glyph: personal ? response.defaults.personal : response.defaults.project,
      color: null,
    });
  }
  for (const icon of response.icons) {
    byProject.set(icon.projectId, {
      name: icon.icon,
      glyph: icon.glyph,
      color: iconColor(icon.color),
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

/** Calls back whenever the Project icons plugin reports an edit. */
export function subscribeToProjectIconChanges(onChange: () => void): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(PROJECT_ICONS_CHANNEL);
    channel.onmessage = () => onChange();
  } catch {
    // Older clients without BroadcastChannel still refresh on focus.
  }
  window.addEventListener("focus", onChange);
  return () => {
    channel?.close();
    window.removeEventListener("focus", onChange);
  };
}
