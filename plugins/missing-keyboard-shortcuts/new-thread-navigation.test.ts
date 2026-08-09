import { describe, expect, it, vi } from "vitest";
import { openNewThread, type NewThreadHost } from "./new-thread-navigation";

describe("openNewThread", () => {
  it("selects the project and hands navigation to BB without loading a URL", () => {
    const calls: string[] = [];
    let selectedProjectId = "proj_old";
    const host: NewThreadHost = {
      getSelectedProjectId() {
        return selectedProjectId;
      },
      selectProject(projectId) {
        calls.push(`select:${projectId}`);
        selectedProjectId = projectId;
      },
      notifyProjectChanged(oldProjectId, newProjectId) {
        calls.push(`notify:${oldProjectId}->${newProjectId}`);
      },
      openComposer: vi.fn(() => {
        calls.push("open");
      }),
    };

    openNewThread(host, "proj_new");

    expect(calls).toEqual([
      "select:proj_new",
      "notify:proj_old->proj_new",
      "open",
    ]);
    expect(host.openComposer).toHaveBeenCalledOnce();
    expect(selectedProjectId).toBe("proj_new");
  });
});
