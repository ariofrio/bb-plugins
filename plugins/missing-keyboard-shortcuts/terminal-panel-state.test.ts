import { describe, expect, it } from "vitest";
import {
  activateTerminalPanel,
  closeTerminalPanel,
  readRecentTerminalId,
  readTerminalPanelSnapshot,
  rememberRecentTerminalId,
  shouldCloseTerminalPanel,
  type StringStorage,
} from "./terminal-panel-state";

class MemoryStorage implements StringStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("terminal panel state", () => {
  it("closes an open non-terminal tab or an already-focused terminal", () => {
    expect(
      shouldCloseTerminalPanel(
        {
          activeTerminalId: "term_one",
          isOpen: true,
          terminalIds: ["term_one"],
        },
        true,
      ),
    ).toBe(true);
    expect(
      shouldCloseTerminalPanel(
        {
          activeTerminalId: "term_one",
          isOpen: true,
          terminalIds: ["term_one"],
        },
        false,
      ),
    ).toBe(false);
    expect(
      shouldCloseTerminalPanel(
        {
          activeTerminalId: "term_one",
          isOpen: false,
          terminalIds: ["term_one"],
        },
        true,
      ),
    ).toBe(false);
    expect(
      shouldCloseTerminalPanel(
        {
          activeTerminalId: null,
          isOpen: true,
          terminalIds: ["term_one"],
        },
        false,
      ),
    ).toBe(true);
    expect(
      shouldCloseTerminalPanel(
        { activeTerminalId: null, isOpen: false, terminalIds: [] },
        false,
      ),
    ).toBe(false);
  });

  it("opens an empty panel with a selected terminal tab", () => {
    const storage = new MemoryStorage();
    const change = activateTerminalPanel(storage, "thr/one", "term/one", 42);

    expect(change.key).toBe("bb.thread.fixedPanelTabsState-thr%2Fone-1");
    expect(readTerminalPanelSnapshot(storage, "thr/one")).toEqual({
      activeTerminalId: "term/one",
      isOpen: true,
      terminalIds: ["term/one"],
    });
    expect(JSON.parse(change.newValue)).toMatchObject({ lastUsedAt: 42 });
  });

  it("selects an existing terminal without duplicating or losing other tabs", () => {
    const storage = new MemoryStorage();
    activateTerminalPanel(storage, "thr_one", "term_one", 10);
    const firstChange = activateTerminalPanel(
      storage,
      "thr_one",
      "term_two",
      11,
    );
    const state = JSON.parse(firstChange.newValue);
    state.secondary.tabs.unshift({
      id: "thread-info:thread-info:none",
      kind: "thread-info",
    });
    state.extra = "preserved";
    storage.setItem(firstChange.key, JSON.stringify(state));

    const change = activateTerminalPanel(storage, "thr_one", "term_one", 12);
    const updated = JSON.parse(change.newValue);
    expect(updated.secondary.tabs).toHaveLength(3);
    expect(updated.secondary.tabs[0]).toEqual({
      id: "thread-info:thread-info:none",
      kind: "thread-info",
    });
    expect(updated.extra).toBe("preserved");
    expect(readTerminalPanelSnapshot(storage, "thr_one")).toEqual({
      activeTerminalId: "term_one",
      isOpen: true,
      terminalIds: ["term_one", "term_two"],
    });
  });

  it("closes the panel while preserving the selected terminal", () => {
    const storage = new MemoryStorage();
    activateTerminalPanel(storage, "thr_one", "term_one", 10);
    closeTerminalPanel(storage, "thr_one", 20);

    expect(readTerminalPanelSnapshot(storage, "thr_one")).toEqual({
      activeTerminalId: "term_one",
      isOpen: false,
      terminalIds: ["term_one"],
    });
  });

  it("remembers the most recently focused terminal per thread", () => {
    const storage = new MemoryStorage();
    rememberRecentTerminalId(storage, "thr_one", "term_one");
    rememberRecentTerminalId(storage, "thr_two", "term_two");

    expect(readRecentTerminalId(storage, "thr_one")).toBe("term_one");
    expect(readRecentTerminalId(storage, "thr_two")).toBe("term_two");
  });

  it("treats malformed native panel state as empty", () => {
    const storage = new MemoryStorage();
    storage.setItem("bb.thread.fixedPanelTabsState-thr_one-1", "not json");

    expect(readTerminalPanelSnapshot(storage, "thr_one")).toEqual({
      activeTerminalId: null,
      isOpen: false,
      terminalIds: [],
    });
  });
});
