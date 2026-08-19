import { describe, expect, it } from "vitest";
import {
  filterThreadsByProject,
  normalizeProjectFilter,
} from "./project-filter";

const projects = [
  { id: "proj_alpha", name: "Alpha" },
  { id: "proj_beta", name: "Beta" },
] as const;

describe("normalizeProjectFilter", () => {
  it("keeps an available project and rejects stale persisted values", () => {
    expect(normalizeProjectFilter("proj_beta", projects)).toBe("proj_beta");
    expect(normalizeProjectFilter("proj_removed", projects)).toBeNull();
    expect(normalizeProjectFilter(null, projects)).toBeNull();
  });
});

describe("filterThreadsByProject", () => {
  const threads = [
    { id: "thr_alpha", projectId: "proj_alpha" },
    { id: "thr_beta", projectId: "proj_beta" },
  ] as const;

  it("returns every thread for the All projects selection", () => {
    expect(filterThreadsByProject(threads, null)).toBe(threads);
  });

  it("returns only threads belonging to the selected project", () => {
    expect(filterThreadsByProject(threads, "proj_beta")).toEqual([
      threads[1],
    ]);
  });
});
