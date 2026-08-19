export const SIDEBAR_FILTER_COUNT_MODES = [
  "None",
  "Projects",
  "Sections",
  "Projects + sections",
] as const;

export type SidebarFilterCountMode =
  (typeof SIDEBAR_FILTER_COUNT_MODES)[number];

export interface ThreadStagesSettingsUpdate {
  showSidebarFilter?: boolean;
  showStageCounts?: boolean;
  sidebarFilterCount?: SidebarFilterCountMode;
}

type SettingsFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function normalizeSidebarFilterCountMode(
  value: string | boolean | undefined,
): SidebarFilterCountMode {
  return typeof value === "string" &&
    SIDEBAR_FILTER_COUNT_MODES.includes(value as SidebarFilterCountMode)
    ? (value as SidebarFilterCountMode)
    : "None";
}

export function countSidebarFilterEntities(
  mode: SidebarFilterCountMode,
  projectCount: number,
  sectionCount: number,
): number | undefined {
  if (mode === "Projects") return projectCount;
  if (mode === "Sections") return sectionCount;
  if (mode === "Projects + sections") return projectCount + sectionCount;
  return undefined;
}

export async function updateThreadStagesSettings(
  values: ThreadStagesSettingsUpdate,
  fetcher: SettingsFetcher = fetch,
): Promise<void> {
  const response = await fetcher("/api/v1/plugins/thread-stages/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (response.ok) return;

  let message = `Could not save Thread stages settings (${response.status}).`;
  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
    };
    message = body.error ?? body.message ?? message;
  } catch {
    // Preserve the actionable HTTP fallback when the response is not JSON.
  }
  throw new Error(message);
}
