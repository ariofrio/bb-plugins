import { describe, expect, it } from "vitest";
import {
  currentThreadId,
  reorderTargetId,
  taskReorderShortcut,
  taskStatusShortcut,
} from "./task-shortcuts";

const baseChord = {
  altKey: false,
  code: "Period",
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
    ).toBe("Blocked");
    expect(taskStatusShortcut({ ...baseChord, ctrlKey: true })).toBe("Backlog");
    expect(taskStatusShortcut({ ...baseChord, altKey: true })).toBe("Canceled");
  });

  it("matches the period key when modifiers change its character", () => {
    expect(
      taskStatusShortcut({ ...baseChord, key: ">", shiftKey: true }),
    ).toBe("To do");
    expect(taskStatusShortcut({ ...baseChord, altKey: true, key: "≥" })).toBe(
      "Canceled",
    );
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
    expect(
      taskStatusShortcut({ ...baseChord, code: "Comma", key: "," }),
    ).toBeNull();
    expect(taskStatusShortcut({ ...baseChord, repeat: true })).toBeNull();
  });
});

describe("taskReorderShortcut", () => {
  const arrowChord = { ...baseChord, key: "ArrowDown" };

  it("maps arrow chords to their reorder intent", () => {
    expect(taskReorderShortcut({ ...arrowChord, altKey: true })).toEqual({
      scope: "step",
      direction: 1,
    });
    expect(
      taskReorderShortcut({ ...arrowChord, key: "ArrowUp", altKey: true }),
    ).toEqual({ scope: "step", direction: -1 });
    expect(
      taskReorderShortcut({ ...arrowChord, altKey: true, shiftKey: true }),
    ).toEqual({ scope: "edge", direction: 1 });
    expect(
      taskReorderShortcut({
        ...arrowChord,
        key: "ArrowUp",
        altKey: true,
        shiftKey: true,
      }),
    ).toEqual({ scope: "edge", direction: -1 });
    expect(taskReorderShortcut({ ...arrowChord, ctrlKey: true })).toEqual({
      scope: "status",
      direction: 1,
    });
    expect(
      taskReorderShortcut({ ...arrowChord, key: "ArrowUp", ctrlKey: true }),
    ).toEqual({ scope: "status", direction: -1 });
  });

  it("rejects unassigned combinations, other keys, and repeats", () => {
    expect(taskReorderShortcut(arrowChord)).toBeNull();
    expect(
      taskReorderShortcut({ ...arrowChord, altKey: true, ctrlKey: true }),
    ).toBeNull();
    expect(
      taskReorderShortcut({ ...arrowChord, ctrlKey: true, shiftKey: true }),
    ).toBeNull();
    expect(
      taskReorderShortcut({ ...arrowChord, altKey: true, metaKey: false }),
    ).toBeNull();
    expect(
      taskReorderShortcut({ ...arrowChord, altKey: true, key: "ArrowLeft" }),
    ).toBeNull();
    expect(
      taskReorderShortcut({ ...arrowChord, altKey: true, repeat: true }),
    ).toBeNull();
  });
});

describe("reorderTargetId", () => {
  const flat = ["thr_a", "thr_b", "thr_c"];

  it("steps a task past one neighbor", () => {
    expect(reorderTargetId(flat, flat, "thr_b", "step", -1)).toEqual({
      beforeThreadId: "thr_a",
    });
    expect(reorderTargetId(flat, flat, "thr_a", "step", 1)).toEqual({
      beforeThreadId: "thr_c",
    });
    expect(reorderTargetId(flat, flat, "thr_b", "step", 1)).toEqual({
      beforeThreadId: null,
    });
  });

  it("sends a task to the first or last position", () => {
    expect(reorderTargetId(flat, flat, "thr_c", "edge", -1)).toEqual({
      beforeThreadId: "thr_a",
    });
    expect(reorderTargetId(flat, flat, "thr_a", "edge", 1)).toEqual({
      beforeThreadId: null,
    });
  });

  it("keeps a task put at the edge it already occupies", () => {
    expect(reorderTargetId(flat, flat, "thr_a", "step", -1)).toBeNull();
    expect(reorderTargetId(flat, flat, "thr_a", "edge", -1)).toBeNull();
    expect(reorderTargetId(flat, flat, "thr_c", "step", 1)).toBeNull();
    expect(reorderTargetId(flat, flat, "thr_c", "edge", 1)).toBeNull();
    expect(reorderTargetId(flat, flat, "thr_missing", "step", 1)).toBeNull();
  });

  it("skips over a sibling's nested threads", () => {
    const ordered = ["thr_a", "thr_b", "thr_b1", "thr_c"];
    const siblings = ["thr_a", "thr_b", "thr_c"];

    expect(reorderTargetId(ordered, siblings, "thr_a", "step", 1)).toEqual({
      beforeThreadId: "thr_c",
    });
    expect(reorderTargetId(ordered, siblings, "thr_b", "step", 1)).toEqual({
      beforeThreadId: null,
    });
    expect(reorderTargetId(ordered, siblings, "thr_a", "edge", 1)).toEqual({
      beforeThreadId: null,
    });
  });

  it("places a task after a trailing sibling's nested threads", () => {
    const ordered = ["thr_a", "thr_b", "thr_c", "thr_c1"];
    const siblings = ["thr_a", "thr_b", "thr_c"];

    expect(reorderTargetId(ordered, siblings, "thr_a", "edge", 1)).toEqual({
      beforeThreadId: "thr_c1",
    });
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
