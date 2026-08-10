import { describe, expect, it } from "vitest";
import {
  activateExistingSideChatPanel,
  activateSideChatPanel,
  activateTerminalPanel,
  closePanel,
  createSideChatPanelTab,
  readRecentSideChatTabId,
  readRecentTerminalId,
  readSideChatPanelSnapshot,
  readTerminalPanelSnapshot,
  removeSideChatPanelTab,
  rememberRecentSideChatTabId,
  rememberRecentTerminalId,
  selectSideChatPanelTab,
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
  it("closes only when a terminal is selected, visible, and focused", () => {
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
        { activeTerminalId: null, isOpen: true, terminalIds: [] },
        true,
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
    closePanel(storage, "thr_one", 20);

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

  it("creates and activates a native side-chat plugin panel tab", () => {
    const storage = new MemoryStorage();
    activateTerminalPanel(storage, "thr_parent", "term_one", 10);
    const tab = createSideChatPanelTab("thr_parent", "thr_side");
    const change = activateSideChatPanel(
      storage,
      "thr_parent",
      tab,
      20,
    );

    expect(tab.id).toBe(
      `plugin-panel:${encodeURIComponent(`side-chat:side-chat:${tab.paramsJson}`)}:none`,
    );
    expect(JSON.parse(tab.paramsJson)).toEqual({
      threadId: "thr_side",
      sourceThreadId: "thr_parent",
      sourceMessageText: "",
      sourceSeqEnd: null,
    });
    expect(readSideChatPanelSnapshot(storage, "thr_parent")).toEqual({
      activeSideChat: { childThreadId: "thr_side", id: tab.id },
      isOpen: true,
      sideChats: [{ childThreadId: "thr_side", id: tab.id }],
    });
    expect(readTerminalPanelSnapshot(storage, "thr_parent")).toEqual({
      activeTerminalId: null,
      isOpen: true,
      terminalIds: ["term_one"],
    });
    expect(JSON.parse(change.newValue).lastUsedAt).toBe(20);
  });

  it("activates an existing side chat without losing sibling tabs", () => {
    const storage = new MemoryStorage();
    const first = createSideChatPanelTab("thr_parent", "thr_first");
    const second = createSideChatPanelTab("thr_parent", "thr_second");
    activateSideChatPanel(storage, "thr_parent", first, 10);
    activateSideChatPanel(storage, "thr_parent", second, 11);
    activateTerminalPanel(storage, "thr_parent", "term_one", 12);

    const change = activateExistingSideChatPanel(
      storage,
      "thr_parent",
      first.id,
      13,
    );
    expect(change).not.toBeNull();
    expect(readSideChatPanelSnapshot(storage, "thr_parent")).toEqual({
      activeSideChat: { childThreadId: "thr_first", id: first.id },
      isOpen: true,
      sideChats: [
        { childThreadId: "thr_first", id: first.id },
        { childThreadId: "thr_second", id: second.id },
      ],
    });
    expect(readTerminalPanelSnapshot(storage, "thr_parent").terminalIds).toEqual([
      "term_one",
    ]);
  });

  it("ignores malformed and wrong-parent side-chat tabs", () => {
    const storage = new MemoryStorage();
    const valid = createSideChatPanelTab("thr_other", "thr_side");
    const key = "bb.thread.fixedPanelTabsState-thr_parent-1";
    storage.setItem(
      key,
      JSON.stringify({
        version: 1,
        secondary: {
          tabs: [
            valid,
            {
              id: "plugin-panel:broken:none",
              kind: "plugin-panel",
              pluginId: "side-chat",
              actionId: "side-chat",
              paramsJson: "not json",
              title: "Side chat",
            },
          ],
          activeTabId: valid.id,
          isOpen: true,
        },
        lastUsedAt: 1,
      }),
    );

    expect(readSideChatPanelSnapshot(storage, "thr_parent")).toEqual({
      activeSideChat: null,
      isOpen: true,
      sideChats: [],
    });
    expect(
      activateExistingSideChatPanel(
        storage,
        "thr_parent",
        valid.id,
      ),
    ).toBeNull();
  });

  it("chooses the active, recent, then latest side chat", () => {
    const first = { childThreadId: "thr_first", id: "tab_first" };
    const second = { childThreadId: "thr_second", id: "tab_second" };
    const panel = { activeSideChat: null, isOpen: true, sideChats: [first, second] };

    expect(selectSideChatPanelTab(panel, first.id)).toBe(first);
    expect(selectSideChatPanelTab(panel, "missing")).toBe(second);
    expect(
      selectSideChatPanelTab({ ...panel, activeSideChat: first }, second.id),
    ).toBe(first);
    expect(
      selectSideChatPanelTab(
        { activeSideChat: null, isOpen: false, sideChats: [] },
        null,
      ),
    ).toBeNull();
  });

  it("remembers the most recently focused side-chat tab per thread", () => {
    const storage = new MemoryStorage();
    rememberRecentSideChatTabId(storage, "thr_one", "tab_one");
    rememberRecentSideChatTabId(storage, "thr_two", "tab_two");

    expect(readRecentSideChatTabId(storage, "thr_one")).toBe("tab_one");
    expect(readRecentSideChatTabId(storage, "thr_two")).toBe("tab_two");
  });

  it("removes a stale side-chat tab without losing sibling tabs", () => {
    const storage = new MemoryStorage();
    const stale = createSideChatPanelTab("thr_parent", "thr_stale");
    const live = createSideChatPanelTab("thr_parent", "thr_live");
    activateSideChatPanel(storage, "thr_parent", live, 10);
    activateSideChatPanel(storage, "thr_parent", stale, 11);
    activateTerminalPanel(storage, "thr_parent", "term_one", 12);

    removeSideChatPanelTab(storage, "thr_parent", stale.id, 13);

    expect(readSideChatPanelSnapshot(storage, "thr_parent")).toEqual({
      activeSideChat: null,
      isOpen: true,
      sideChats: [{ childThreadId: "thr_live", id: live.id }],
    });
    expect(readTerminalPanelSnapshot(storage, "thr_parent")).toEqual({
      activeTerminalId: "term_one",
      isOpen: true,
      terminalIds: ["term_one"],
    });
  });
});
