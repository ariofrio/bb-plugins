import { describe, expect, it, vi } from "vitest";
import {
  countSidebarFilterEntities,
  normalizeSidebarFilterCountMode,
  updateThreadStagesSettings,
} from "./sidebar-settings";

describe("sidebar settings", () => {
  it("normalizes count modes and falls back to no count", () => {
    expect(normalizeSidebarFilterCountMode("Projects")).toBe("Projects");
    expect(normalizeSidebarFilterCountMode("Sections")).toBe("Sections");
    expect(normalizeSidebarFilterCountMode("Projects + sections")).toBe(
      "Projects + sections",
    );
    expect(normalizeSidebarFilterCountMode("unexpected")).toBe("None");
    expect(normalizeSidebarFilterCountMode(false)).toBe("None");
  });

  it("calculates the selected sidebar total", () => {
    expect(countSidebarFilterEntities("None", 3, 2)).toBeUndefined();
    expect(countSidebarFilterEntities("Projects", 3, 2)).toBe(3);
    expect(countSidebarFilterEntities("Sections", 3, 2)).toBe(2);
    expect(countSidebarFilterEntities("Projects + sections", 3, 2)).toBe(5);
  });

  it("updates this plugin through bb's settings endpoint", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));

    await updateThreadStagesSettings(
      { showSidebarFilter: false, sidebarFilterCount: "Projects" },
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
            sidebarFilterCount: "Projects",
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
      updateThreadStagesSettings({ showStageCounts: false }, fetcher),
    ).rejects.toThrow("Invalid value");
  });
});
