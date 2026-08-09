import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasOpenComposer,
  openRegisteredComposer,
  registerOpenComposer,
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
});
