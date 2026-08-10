import { describe, expect, it } from "vitest";
import { shouldSyncThreads } from "./task-sync";

describe("shouldSyncThreads", () => {
  it("never derives or writes task assignments after listState fails", () => {
    expect(
      shouldSyncThreads({
        hasOrganization: false,
        loadError: "Could not load tasks",
        sidebarStatus: "ready",
        syncInFlight: false,
        unsyncedCount: 12,
      }),
    ).toBe(false);
  });

  it("syncs genuinely new threads after task state is ready", () => {
    expect(
      shouldSyncThreads({
        hasOrganization: true,
        loadError: null,
        sidebarStatus: "ready",
        syncInFlight: false,
        unsyncedCount: 1,
      }),
    ).toBe(true);
  });
});
