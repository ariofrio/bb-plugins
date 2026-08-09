import { describe, expect, it } from "vitest";
import {
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
  isTerminalShortcut,
  newThreadTarget,
} from "./shortcut-actions";

const baseChord = {
  altKey: false,
  ctrlKey: false,
  key: "",
  metaKey: true,
  repeat: false,
  shiftKey: false,
};

describe("historyDirection", () => {
  it("matches Command-[ and Command-]", () => {
    expect(historyDirection({ ...baseChord, key: "[" })).toBe(-1);
    expect(historyDirection({ ...baseChord, key: "]" })).toBe(1);
  });

  it("rejects extra modifiers and held-key repeats", () => {
    expect(historyDirection({ ...baseChord, key: "[", altKey: true })).toBeNull();
    expect(historyDirection({ ...baseChord, key: "]", ctrlKey: true })).toBeNull();
    expect(historyDirection({ ...baseChord, key: "[", shiftKey: true })).toBeNull();
    expect(historyDirection({ ...baseChord, key: "]", repeat: true })).toBeNull();
  });
});

const archiveChord = {
  ...baseChord,
  key: ".",
};

describe("isArchiveShortcut", () => {
  it("matches Command-.", () => {
    expect(isArchiveShortcut(archiveChord)).toBe(true);
  });

  it("rejects extra modifiers and held-key repeats", () => {
    expect(isArchiveShortcut({ ...archiveChord, altKey: true })).toBe(false);
    expect(isArchiveShortcut({ ...archiveChord, ctrlKey: true })).toBe(false);
    expect(isArchiveShortcut({ ...archiveChord, repeat: true })).toBe(false);
  });

  it("rejects other chords", () => {
    expect(isArchiveShortcut({ ...archiveChord, key: "B" })).toBe(false);
    expect(isArchiveShortcut({ ...archiveChord, metaKey: false })).toBe(false);
    expect(isArchiveShortcut({ ...archiveChord, shiftKey: true })).toBe(false);
  });
});

describe("isTerminalShortcut", () => {
  const chord = {
    ...baseChord,
    ctrlKey: true,
    key: "`",
    metaKey: false,
  };

  it("matches Control-backtick", () => {
    expect(isTerminalShortcut(chord)).toBe(true);
  });

  it("rejects extra modifiers and held-key repeats", () => {
    expect(isTerminalShortcut({ ...chord, altKey: true })).toBe(false);
    expect(isTerminalShortcut({ ...chord, metaKey: true })).toBe(false);
    expect(isTerminalShortcut({ ...chord, shiftKey: true })).toBe(false);
    expect(isTerminalShortcut({ ...chord, repeat: true })).toBe(false);
  });

  it("rejects other chords", () => {
    expect(isTerminalShortcut({ ...chord, key: "~" })).toBe(false);
    expect(isTerminalShortcut({ ...chord, ctrlKey: false })).toBe(false);
  });
});

describe("newThreadTarget", () => {
  it("targets no project for Command-N", () => {
    expect(
      newThreadTarget({ ...baseChord, key: "n" }, "/projects/proj_one"),
    ).toEqual({ projectId: "proj_personal" });
  });

  it("targets the selected thread's project for Command-Shift-N", () => {
    const chord = { ...baseChord, key: "N", shiftKey: true };
    expect(
      newThreadTarget(chord, "/projects/proj_one/threads/thr_standard"),
    ).toEqual({ projectId: "proj_one" });
    expect(newThreadTarget(chord, "/threads/thr_personal")).toEqual({
      projectId: "proj_personal",
    });
  });

  it("decodes project IDs from thread routes", () => {
    expect(
      newThreadTarget(
        { ...baseChord, key: "n", shiftKey: true },
        "/projects/proj%2Fone/threads/thr_standard",
      ),
    ).toEqual({ projectId: "proj/one" });
  });

  it("targets the last selected thread's project when no thread is selected", () => {
    expect(
      newThreadTarget(
        { ...baseChord, key: "n", shiftKey: true },
        "/",
        "proj_last_selected",
      ),
    ).toEqual({ projectId: "proj_last_selected" });
  });

  it("targets no project when no thread has ever been selected", () => {
    expect(
      newThreadTarget(
        { ...baseChord, key: "n", shiftKey: true },
        "/",
        null,
      ),
    ).toEqual({ projectId: "proj_personal" });
  });

  it("rejects extra modifiers, held-key repeats, and other keys", () => {
    const chord = { ...baseChord, key: "n" };
    expect(newThreadTarget({ ...chord, altKey: true }, "/threads/thr")).toBeNull();
    expect(newThreadTarget({ ...chord, ctrlKey: true }, "/threads/thr")).toBeNull();
    expect(newThreadTarget({ ...chord, repeat: true }, "/threads/thr")).toBeNull();
    expect(newThreadTarget({ ...chord, key: "m" }, "/threads/thr")).toBeNull();
    expect(newThreadTarget({ ...chord, metaKey: false }, "/threads/thr")).toBeNull();
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
