import { describe, expect, it, vi } from "vitest";
import {
  createNativeCommandDelegate,
  type NativeCommandTarget,
} from "./native-command-delegation";

function createKeyboardEvent(
  type: string,
  init: KeyboardEventInit,
): KeyboardEvent {
  const event = new Event(type, init);
  for (const [key, value] of Object.entries(init)) {
    if (key === "bubbles" || key === "cancelable" || key === "composed") {
      continue;
    }
    Object.defineProperty(event, key, { value });
  }
  return event as KeyboardEvent;
}

describe("native command delegation", () => {
  it("dispatches the configured cross-client thread.new shortcut", async () => {
    const dispatched: KeyboardEvent[] = [];
    const target: NativeCommandTarget = {
      dispatchEvent(event) {
        dispatched.push(event);
        return !event.defaultPrevented;
      },
    };
    const delegate = createNativeCommandDelegate({
      command: "thread.new",
      createEvent: createKeyboardEvent,
      fetchConfig: vi.fn(async () => ({
        keybindings: [
          {
            command: "thread.new",
            desktopOnly: true,
            shortcut: {
              alt: false,
              control: false,
              key: "n",
              meta: false,
              mod: true,
              shift: false,
            },
          },
          {
            command: "thread.new",
            desktopOnly: false,
            shortcut: {
              alt: false,
              control: false,
              key: "o",
              meta: false,
              mod: true,
              shift: true,
            },
          },
        ],
      })),
      isMac: true,
      target,
    });

    await delegate.dispatch();

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toMatchObject({
      altKey: false,
      ctrlKey: false,
      key: "o",
      metaKey: true,
      shiftKey: true,
    });
    expect(delegate.isDelegatedEvent(dispatched[0]!)).toBe(true);
  });

  it("prefetches once and falls back to bb's web-safe default", async () => {
    const fetchConfig = vi.fn(async () => {
      throw new Error("offline");
    });
    const dispatched: KeyboardEvent[] = [];
    const delegate = createNativeCommandDelegate({
      command: "thread.new",
      createEvent: createKeyboardEvent,
      fetchConfig,
      isMac: true,
      target: {
        dispatchEvent(event) {
          dispatched.push(event);
          return true;
        },
      },
    });

    const prefetch = delegate.prefetch();
    await Promise.all([prefetch, delegate.dispatch()]);

    expect(fetchConfig).toHaveBeenCalledOnce();
    expect(dispatched[0]).toMatchObject({
      key: "o",
      metaKey: true,
      shiftKey: true,
    });
  });
});
