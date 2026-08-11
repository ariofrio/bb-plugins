// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  PROJECT_ICONS_CHANNEL,
  buildProjectIconMap,
  subscribeToProjectIconChanges,
} from "./project-icons";

const folder = [["path", { d: "M1" }]] as const;
const bubble = [["path", { d: "M2" }]] as const;
const rocket = [["path", { d: "M3" }]] as const;

const response = {
  icons: [
    { projectId: "proj_a", icon: "rocket", color: "teal", glyph: rocket },
    { projectId: "proj_b", icon: "coffee-01", color: null, glyph: rocket },
  ],
  defaults: { project: folder, personal: bubble },
};

describe("buildProjectIconMap", () => {
  it("falls back to the folder, and to the bubble for the personal project", () => {
    const map = buildProjectIconMap(response, ["proj_c", "proj_personal"]);

    expect(map.get("proj_c")).toEqual({
      name: "folder-01",
      glyph: folder,
      color: null,
    });
    expect(map.get("proj_personal")).toEqual({
      name: "bubble-chat",
      glyph: bubble,
      color: null,
    });
  });

  it("mixes a chosen color into the theme's foreground", () => {
    const map = buildProjectIconMap(response, ["proj_a", "proj_b"]);

    expect(map.get("proj_a")).toEqual({
      name: "rocket",
      glyph: rocket,
      color: "color-mix(in oklch, oklch(0.704 0.14 182.503) 45%, var(--foreground))",
    });
    expect(map.get("proj_b")?.color).toBeNull();
  });

  it("ignores a color name it does not know", () => {
    const map = buildProjectIconMap(
      {
        ...response,
        icons: [
          { projectId: "proj_a", icon: "rocket", color: "chartreuse", glyph: rocket },
        ],
      },
      ["proj_a"],
    );

    expect(map.get("proj_a")?.color).toBeNull();
  });
});

describe("subscribeToProjectIconChanges", () => {
  it("wakes on an announcement from the Project icons plugin", async () => {
    const seen = vi.fn();
    const stop = subscribeToProjectIconChanges(seen);
    const announcer = new BroadcastChannel(PROJECT_ICONS_CHANNEL);

    announcer.postMessage({ type: "icons-changed" });
    await vi.waitFor(() => expect(seen).toHaveBeenCalled());

    stop();
    announcer.postMessage({ type: "icons-changed" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(seen).toHaveBeenCalledTimes(1);
    announcer.close();
  });

  it("names the channel the other plugin broadcasts on", () => {
    expect(PROJECT_ICONS_CHANNEL).toBe("bb.project-icons");
  });
});
