import { describe, expect, it } from "vitest";
import {
  filterThreads,
  normalizeThreadFilter,
  serializeThreadFilter,
  type ThreadFilter,
} from "./thread-filter";

const projects = [
  { id: "proj_alpha", name: "Alpha" },
  { id: "proj_beta", name: "Beta" },
] as const;
const sections = [
  { id: "section_now", name: "Now" },
  { id: "section_later", name: "Later" },
] as const;

describe("normalizeThreadFilter", () => {
  it("serializes the uncategorized section scope", () => {
    expect(serializeThreadFilter({ kind: "uncategorized" })).toBe(
      "uncategorized",
    );
  });

  it("keeps available filters, migrates legacy project ids, and rejects stale values", () => {
    expect(
      normalizeThreadFilter("project:proj_beta", projects, sections),
    ).toEqual({
      kind: "project",
      id: "proj_beta",
    });
    expect(
      normalizeThreadFilter("section:section_now", projects, sections),
    ).toEqual({
      kind: "section",
      id: "section_now",
    });
    expect(
      normalizeThreadFilter("uncategorized", projects, sections),
    ).toEqual({ kind: "uncategorized" });
    expect(normalizeThreadFilter("proj_alpha", projects, sections)).toEqual({
      kind: "project",
      id: "proj_alpha",
    });
    expect(
      normalizeThreadFilter("project:proj_removed", projects, sections),
    ).toBeNull();
    expect(
      normalizeThreadFilter("section:section_removed", projects, sections),
    ).toBeNull();
    expect(normalizeThreadFilter("uncategorized", projects, [])).toBeNull();
    expect(normalizeThreadFilter(null, projects, sections)).toBeNull();
  });

  it("preserves a section selection until sections finish loading", () => {
    expect(normalizeThreadFilter("section:section_now", projects, null)).toEqual({
      kind: "section",
      id: "section_now",
    });
    expect(normalizeThreadFilter("uncategorized", projects, null)).toEqual({
      kind: "uncategorized",
    });
  });
});

describe("filterThreads", () => {
  const threads = [
    {
      id: "thr_alpha",
      parentThreadId: null,
      projectId: "proj_alpha",
      sectionId: "section_now",
    },
    {
      id: "thr_alpha_child",
      parentThreadId: "thr_alpha",
      projectId: "proj_alpha",
      sectionId: null,
    },
    {
      id: "thr_beta",
      parentThreadId: null,
      projectId: "proj_beta",
      sectionId: "section_later",
    },
    {
      id: "thr_uncategorized",
      parentThreadId: null,
      projectId: "proj_beta",
      sectionId: null,
    },
    {
      id: "thr_uncategorized_child",
      parentThreadId: "thr_uncategorized",
      projectId: "proj_beta",
      sectionId: "section_now",
    },
  ] as const;

  it("returns every thread when no filter is selected", () => {
    expect(filterThreads(threads, null)).toBe(threads);
  });

  it("filters a complete hierarchy by project", () => {
    const filter: ThreadFilter = { kind: "project", id: "proj_alpha" };
    expect(filterThreads(threads, filter)).toEqual([threads[0], threads[1]]);
  });

  it("keeps descendants of roots in the selected section", () => {
    const filter: ThreadFilter = { kind: "section", id: "section_now" };
    expect(filterThreads(threads, filter)).toEqual([threads[0], threads[1]]);
  });

  it("keeps descendants of uncategorized roots", () => {
    const filter: ThreadFilter = { kind: "uncategorized" };
    expect(filterThreads(threads, filter)).toEqual([threads[3], threads[4]]);
  });
});
