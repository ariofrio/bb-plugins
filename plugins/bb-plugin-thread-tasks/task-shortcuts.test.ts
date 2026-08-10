import { describe, expect, it } from "vitest";
import { currentThreadId, taskStatusShortcut } from "./task-shortcuts";

const baseChord = {
  altKey: false,
  ctrlKey: false,
  key: ".",
  metaKey: true,
  repeat: false,
  shiftKey: false,
};

describe("taskStatusShortcut", () => {
  it("maps each period chord to its task status", () => {
    expect(taskStatusShortcut(baseChord)).toBe("Done");
    expect(taskStatusShortcut({ ...baseChord, shiftKey: true })).toBe("To do");
    expect(
      taskStatusShortcut({ ...baseChord, ctrlKey: true, shiftKey: true }),
    ).toBe("Waiting");
    expect(taskStatusShortcut({ ...baseChord, ctrlKey: true })).toBe("Deferred");
    expect(taskStatusShortcut({ ...baseChord, altKey: true })).toBe("Canceled");
  });

  it("leaves Working to the automatic workflow", () => {
    const statuses = [
      taskStatusShortcut(baseChord),
      taskStatusShortcut({ ...baseChord, shiftKey: true }),
      taskStatusShortcut({ ...baseChord, ctrlKey: true, shiftKey: true }),
      taskStatusShortcut({ ...baseChord, ctrlKey: true }),
      taskStatusShortcut({ ...baseChord, altKey: true }),
    ];

    expect(statuses).not.toContain("Working");
  });

  it("rejects unassigned modifier combinations", () => {
    expect(
      taskStatusShortcut({ ...baseChord, altKey: true, shiftKey: true }),
    ).toBeNull();
    expect(
      taskStatusShortcut({ ...baseChord, altKey: true, ctrlKey: true }),
    ).toBeNull();
  });

  it("rejects other chords and held-key repeats", () => {
    expect(taskStatusShortcut({ ...baseChord, metaKey: false })).toBeNull();
    expect(taskStatusShortcut({ ...baseChord, key: "," })).toBeNull();
    expect(taskStatusShortcut({ ...baseChord, repeat: true })).toBeNull();
  });
});

describe("currentThreadId", () => {
  it("reads projectless and project-scoped thread routes", () => {
    expect(currentThreadId("/threads/thr_personal")).toBe("thr_personal");
    expect(currentThreadId("/projects/proj_one/threads/thr_standard")).toBe(
      "thr_standard",
    );
  });

  it("decodes thread IDs and ignores non-thread routes", () => {
    expect(currentThreadId("/threads/thr%5Fencoded")).toBe("thr_encoded");
    expect(currentThreadId("/projects/proj_one")).toBeNull();
    expect(currentThreadId("/settings/archived")).toBeNull();
    expect(currentThreadId("/threads/thr_one/extra")).toBeNull();
  });
});
