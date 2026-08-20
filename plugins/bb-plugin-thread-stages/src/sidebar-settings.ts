export interface ThreadStagesSettingsUpdate {
  showSidebarFilter?: boolean;
  showStageCounts?: boolean;
}

type SettingsFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

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
