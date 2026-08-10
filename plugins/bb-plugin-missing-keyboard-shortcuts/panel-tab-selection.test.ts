import { describe, expect, it, vi } from "vitest";
import {
  selectPanelTabWhenReady,
  type PanelTabButton,
  type PanelTabObserver,
  type PanelTabRoot,
} from "./panel-tab-selection";

function button(icon: "SideChat" | "Terminal"): PanelTabButton {
  return {
    click: vi.fn(),
    hasIcon: (candidate) => candidate === icon,
  };
}

describe("panel tab selection", () => {
  it("selects the requested tab when host reconciliation makes it available", () => {
    const controller = new AbortController();
    const terminal = button("Terminal");
    let buttons: PanelTabButton[] = [];
    let notifyChanged: (() => void) | undefined;
    const observer: PanelTabObserver = {
      disconnect: vi.fn(),
      observe: vi.fn(),
    };
    const root: PanelTabRoot = {
      panelTabButtons: () => buttons,
    };

    const stop = selectPanelTabWhenReady({
      createObserver(callback) {
        notifyChanged = callback;
        return observer;
      },
      icon: "Terminal",
      index: () => 0,
      isCurrent: () => true,
      root,
      signal: controller.signal,
    });

    expect(terminal.click).not.toHaveBeenCalled();
    buttons = [terminal];
    notifyChanged?.();
    expect(terminal.click).toHaveBeenCalledOnce();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    stop();
  });

  it("selects the exact side-chat sibling by its kind-relative index", () => {
    const controller = new AbortController();
    const first = button("SideChat");
    const terminal = button("Terminal");
    const second = button("SideChat");
    const root: PanelTabRoot = {
      panelTabButtons: () => [first, terminal, second],
    };

    selectPanelTabWhenReady({
      createObserver: () => ({ disconnect: vi.fn(), observe: vi.fn() }),
      icon: "SideChat",
      index: () => 1,
      isCurrent: () => true,
      root,
      signal: controller.signal,
    });

    expect(first.click).not.toHaveBeenCalled();
    expect(second.click).toHaveBeenCalledOnce();
  });
});
