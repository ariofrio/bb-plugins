import { describe, expect, it, vi } from "vitest";
import { updateThreadStagesSettings } from "./sidebar-settings";

describe("sidebar settings", () => {
  it("updates this plugin through bb's settings endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    await updateThreadStagesSettings(
      { showSidebarFilter: false },
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/plugins/thread-stages/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          values: {
            showSidebarFilter: false,
          },
        }),
      },
    );
  });

  it("reports rejected settings updates", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Invalid value" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      updateThreadStagesSettings(
        { showCollapsedStageIndicators: true },
        fetcher,
      ),
    ).rejects.toThrow("Invalid value");
  });
});
