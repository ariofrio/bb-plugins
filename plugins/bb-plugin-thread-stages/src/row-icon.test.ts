import { describe, expect, it } from "vitest";
import { rowIcon } from "./row-icon";
import type { ProjectIconView } from "./icons";

const view = (name: string): ProjectIconView => ({
  name,
  glyph: [] as unknown as ProjectIconView["glyph"],
  color: null,
});

const projects = new Map([["proj_a", view("folder-01")]]);
const sections = new Map([["sec_a", view("rocket")]]);

describe("rowIcon", () => {
  it("prefers the section's own icon over the project's", () => {
    expect(
      rowIcon({ sectionId: "sec_a", projectId: "proj_a" }, { sections, projects })
        ?.name,
    ).toBe("rocket");
  });

  it("falls back to the project when the section has no icon of its own", () => {
    expect(
      rowIcon({ sectionId: "sec_none", projectId: "proj_a" }, { sections, projects })
        ?.name,
    ).toBe("folder-01");
  });

  it("falls back to the project for a thread in no section", () => {
    expect(
      rowIcon({ sectionId: null, projectId: "proj_a" }, { sections, projects })
        ?.name,
    ).toBe("folder-01");
  });

  it("draws nothing when neither is known", () => {
    expect(
      rowIcon({ sectionId: null, projectId: "proj_gone" }, { sections, projects }),
    ).toBeNull();
  });
});
