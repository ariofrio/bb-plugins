import { describe, expect, it, vi } from "vitest";
import { waitForLifecycleAction } from "./lifecycle-action";

function observerHarness() {
  let callback: (() => void) | null = null;
  const stop = vi.fn();
  return {
    emit() {
      callback?.();
    },
    observe(next: () => void) {
      callback = next;
      return stop;
    },
    stop,
  };
}

describe("lifecycle action", () => {
  it("keeps trying on lifecycle changes without an attempt limit", () => {
    const controller = new AbortController();
    const observer = observerHarness();
    let ready = false;
    const attempt = vi.fn(() => ready);

    waitForLifecycleAction({
      attempt,
      isCurrent: () => true,
      observe: observer.observe,
      signal: controller.signal,
    });
    for (let index = 0; index < 500; index += 1) observer.emit();
    expect(attempt).toHaveBeenCalledTimes(501);
    expect(observer.stop).not.toHaveBeenCalled();

    ready = true;
    observer.emit();
    observer.emit();
    expect(attempt).toHaveBeenCalledTimes(502);
    expect(observer.stop).toHaveBeenCalledTimes(1);
  });

  it("stops when the request is aborted", () => {
    const controller = new AbortController();
    const observer = observerHarness();
    const attempt = vi.fn(() => false);
    waitForLifecycleAction({
      attempt,
      isCurrent: () => true,
      observe: observer.observe,
      signal: controller.signal,
    });

    controller.abort();
    observer.emit();
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(observer.stop).toHaveBeenCalledTimes(1);
  });

  it("stops after a lifecycle change reveals that navigation moved on", () => {
    const controller = new AbortController();
    const observer = observerHarness();
    let current = true;
    const attempt = vi.fn(() => false);
    waitForLifecycleAction({
      attempt,
      isCurrent: () => current,
      observe: observer.observe,
      signal: controller.signal,
    });

    current = false;
    observer.emit();
    observer.emit();
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(observer.stop).toHaveBeenCalledTimes(1);
  });
});
