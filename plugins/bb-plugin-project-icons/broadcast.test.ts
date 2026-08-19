// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { PROJECT_ICONS_CHANNEL, announceProjectIconsChanged } from "./broadcast";

describe("announceProjectIconsChanged", () => {
  it("reaches a listener in the same window", async () => {
    const listener = new BroadcastChannel(PROJECT_ICONS_CHANNEL);
    const heard = vi.fn();
    listener.onmessage = heard;

    announceProjectIconsChanged();
    await vi.waitFor(() => expect(heard).toHaveBeenCalled());

    listener.close();
  });

  it("uses the channel name Thread workflow listens on", () => {
    // Mirrored in bb-plugin-thread-workflow/project-icons.ts.
    expect(PROJECT_ICONS_CHANNEL).toBe("bb.project-icons");
  });
});
