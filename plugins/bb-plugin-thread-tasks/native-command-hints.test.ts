import { describe, expect, it, vi } from "vitest";
import { notifyNativeShortcutHandled } from "./native-command-hints";

describe("native command hints", () => {
  it("dispatches an inert non-modifier keydown for bb's hint listener", () => {
    const dispatchEvent = vi.fn(() => true);
    const createEvent = vi.fn((type: string, init: KeyboardEventInit) => ({
      ...init,
      type,
    }) as KeyboardEvent);

    notifyNativeShortcutHandled({ dispatchEvent }, createEvent);

    expect(createEvent).toHaveBeenCalledWith("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Unidentified",
      key: "Unidentified",
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
