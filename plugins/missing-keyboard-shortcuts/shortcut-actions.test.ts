import { describe, expect, it } from "vitest";
import {
  currentThreadId,
  historyDirection,
  isArchiveShortcut,
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
  key: "A",
  shiftKey: true,
};

describe("isArchiveShortcut", () => {
  it("matches Command-Shift-A", () => {
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
    expect(isArchiveShortcut({ ...archiveChord, shiftKey: false })).toBe(false);
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
