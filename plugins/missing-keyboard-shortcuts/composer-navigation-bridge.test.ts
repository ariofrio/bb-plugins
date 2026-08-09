import { afterEach, describe, expect, it, vi } from "vitest";
import {
  focusPrimaryComposer,
  hasOpenComposer,
  openRegisteredComposer,
  registerOpenComposer,
  registerPrimaryComposerFocus,
} from "./composer-navigation-bridge";

const disposers: Array<() => void> = [];

afterEach(() => {
  while (disposers.length > 0) disposers.pop()?.();
});

describe("composer navigation bridge", () => {
  it("opens the latest mounted composer and falls back when it unmounts", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = registerOpenComposer(first);
    disposers.push(unregisterFirst);
    const unregisterSecond = registerOpenComposer(second);
    disposers.push(unregisterSecond);

    expect(hasOpenComposer()).toBe(true);
    expect(openRegisteredComposer()).toBe(true);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();

    unregisterSecond();
    expect(openRegisteredComposer()).toBe(true);
    expect(first).toHaveBeenCalledOnce();
  });

  it("reports when no composer is mounted", () => {
    expect(hasOpenComposer()).toBe(false);
    expect(openRegisteredComposer()).toBe(false);
  });

  it("focuses the primary composer registered for the requested thread", () => {
    const firstThread = vi.fn();
    const secondThread = vi.fn();
    disposers.push(registerPrimaryComposerFocus("thr_one", firstThread));
    disposers.push(registerPrimaryComposerFocus("thr_two", secondThread));

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
    expect(focusPrimaryComposer("thr_missing")).toBe(false);
  });
});
