import { describe, expect, it } from "vitest";
import { buildProjectIconMap } from "./project-icons";

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

    expect(map.get("proj_c")).toEqual({ glyph: folder, colorClass: "" });
    expect(map.get("proj_personal")).toEqual({ glyph: bubble, colorClass: "" });
  });

  it("uses a chosen icon and maps its color to a class", () => {
    const map = buildProjectIconMap(response, ["proj_a", "proj_b"]);

    expect(map.get("proj_a")).toEqual({
      glyph: rocket,
      colorClass: "text-teal-500",
    });
    expect(map.get("proj_b")?.colorClass).toBe("");
  });

  it("ignores a color it does not know", () => {
    const map = buildProjectIconMap(
      {
        ...response,
        icons: [
          { projectId: "proj_a", icon: "rocket", color: "chartreuse", glyph: rocket },
        ],
      },
      ["proj_a"],
    );

    expect(map.get("proj_a")?.colorClass).toBe("");
  });
});
