import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveRegisteredThread,
  focusedSecondaryComposerThreadId,
  focusPrimaryComposer,
  focusSecondaryComposer,
  hasPrimaryComposer,
  isSecondaryComposerFocused,
  registerPrimaryComposerFocus,
  registerSecondaryComposer,
  registerThreadArchive,
} from "./composer-navigation-bridge";

const disposers: Array<() => void> = [];

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
});

describe("composer navigation bridge", () => {
  it("runs the latest native archive action for the requested thread", () => {
    const first = vi.fn();
    const second = vi.fn();
    disposers.push(registerThreadArchive("thr_one", first));
    disposers.push(registerThreadArchive("thr_two", second));

    expect(archiveRegisteredThread("thr_two")).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(archiveRegisteredThread("thr_missing")).toBe(false);
  });

  it("focuses the primary composer registered for the requested thread", () => {
    const firstThread = vi.fn();
    const secondThread = vi.fn();
    disposers.push(registerPrimaryComposerFocus("thr_one", firstThread));
    disposers.push(registerPrimaryComposerFocus("thr_two", secondThread));

    expect(hasPrimaryComposer("thr_two")).toBe(true);
    expect(focusPrimaryComposer("thr_two")).toBe(true);
    expect(firstThread).not.toHaveBeenCalled();
    expect(secondThread).toHaveBeenCalledOnce();
  });

  it("uses the latest primary composer and falls back when it unmounts", () => {
    const first = vi.fn();
    const second = vi.fn();
    disposers.push(registerPrimaryComposerFocus("thr_one", first));
    const unregisterSecond = registerPrimaryComposerFocus("thr_one", second);
    disposers.push(unregisterSecond);

    expect(focusPrimaryComposer("thr_one")).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();

    unregisterSecond();
    expect(focusPrimaryComposer("thr_one")).toBe(true);
    expect(first).toHaveBeenCalledOnce();
  });

  it("reports when the thread has no primary composer", () => {
    expect(hasPrimaryComposer("thr_missing")).toBe(false);
    expect(focusPrimaryComposer("thr_missing")).toBe(false);
  });

  it("focuses the root new-thread primary composer", () => {
    const focus = vi.fn();
    disposers.push(registerPrimaryComposerFocus(null, focus));

    expect(hasPrimaryComposer(null)).toBe(true);
    expect(focusPrimaryComposer(null)).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
  });

  it("focuses only the requested visible secondary composer", () => {
    const hidden = vi.fn();
    const visible = vi.fn();
    disposers.push(
      registerSecondaryComposer("thr_parent", "thr_hidden", {
        focus: hidden,
        isFocused: () => false,
        isVisible: () => false,
      }),
    );
    disposers.push(
      registerSecondaryComposer("thr_parent", "thr_visible", {
        focus: visible,
        isFocused: () => false,
        isVisible: () => true,
      }),
    );

    expect(focusSecondaryComposer("thr_parent", "thr_hidden")).toBe(false);
    expect(focusSecondaryComposer("thr_parent", "thr_visible")).toBe(true);
    expect(hidden).not.toHaveBeenCalled();
    expect(visible).toHaveBeenCalledOnce();
  });

  it("reports which exact secondary composer owns DOM focus", () => {
    let firstFocused = false;
    let secondFocused = true;
    disposers.push(
      registerSecondaryComposer("thr_parent", "thr_one", {
        focus: vi.fn(),
        isFocused: () => firstFocused,
        isVisible: () => true,
      }),
    );
    disposers.push(
      registerSecondaryComposer("thr_parent", "thr_two", {
        focus: vi.fn(),
        isFocused: () => secondFocused,
        isVisible: () => true,
      }),
    );

    expect(isSecondaryComposerFocused("thr_parent", "thr_one")).toBe(false);
    expect(isSecondaryComposerFocused("thr_parent", "thr_two")).toBe(true);
    expect(focusedSecondaryComposerThreadId("thr_parent")).toBe("thr_two");

    firstFocused = true;
    secondFocused = false;
    expect(focusedSecondaryComposerThreadId("thr_parent")).toBe("thr_one");
  });

  it("falls back to an earlier secondary registration after unmount", () => {
    const first = vi.fn();
    const second = vi.fn();
    disposers.push(
      registerSecondaryComposer("thr_parent", "thr_side", {
        focus: first,
        isFocused: () => false,
        isVisible: () => true,
      }),
    );
    const unregisterSecond = registerSecondaryComposer(
      "thr_parent",
      "thr_side",
      {
        focus: second,
        isFocused: () => false,
        isVisible: () => true,
      },
    );
    disposers.push(unregisterSecond);

    expect(focusSecondaryComposer("thr_parent", "thr_side")).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    unregisterSecond();
    expect(focusSecondaryComposer("thr_parent", "thr_side")).toBe(true);
    expect(first).toHaveBeenCalledOnce();
  });
});
