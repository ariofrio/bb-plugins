import { describe, expect, it } from "vitest";
import { ancestorsOf, rootOf } from "./trail";

const threads = [
  { id: "root", parentThreadId: null, title: "Polish the dashboard", titleFallback: null, sectionId: "sec_a" },
  { id: "child", parentThreadId: "root", title: "Check the loading state", titleFallback: null, sectionId: null },
  { id: "grandchild", parentThreadId: "child", title: null, titleFallback: "Trace the timer", sectionId: null },
  { id: "orphan", parentThreadId: "missing", title: "Adrift", titleFallback: null, sectionId: null },
];

describe("rootOf", () => {
  it("returns the thread itself when it has no parent", () => {
    expect(rootOf(threads, "root")?.id).toBe("root");
  });

  it("climbs to the root, which is where bb keeps the section", () => {
    expect(rootOf(threads, "grandchild")?.id).toBe("root");
    expect(rootOf(threads, "grandchild")?.sectionId).toBe("sec_a");
  });

  it("stops at the highest thread it can see", () => {
    expect(rootOf(threads, "orphan")?.id).toBe("orphan");
  });

  it("survives a cycle rather than hanging the header", () => {
    const cyclic = [
      { id: "a", parentThreadId: "b", title: "A", titleFallback: null, sectionId: null },
      { id: "b", parentThreadId: "a", title: "B", titleFallback: null, sectionId: null },
    ];

    expect(rootOf(cyclic, "a")).not.toBeNull();
  });
});

describe("ancestorsOf", () => {
  it("lists them oldest first, without the thread itself", () => {
    expect(ancestorsOf(threads, "grandchild").map(({ id }) => id)).toEqual([
      "root",
      "child",
    ]);
  });

  it("is empty for a root thread", () => {
    expect(ancestorsOf(threads, "root")).toEqual([]);
  });

  it("falls back to the name bb shows while a thread is unnamed", () => {
    expect(ancestorsOf(threads, "grandchild").at(-1)?.title).toBe(
      "Check the loading state",
    );
    expect(rootOf(threads, "grandchild")?.title).toBe("Polish the dashboard");
  });

  it("names an unnamed ancestor by its fallback", () => {
    const deep = [
      ...threads,
      { id: "great", parentThreadId: "grandchild", title: null, titleFallback: null, sectionId: null },
    ];

    expect(ancestorsOf(deep, "great").map(({ title }) => title)).toEqual([
      "Polish the dashboard",
      "Check the loading state",
      "Trace the timer",
    ]);
  });
});
