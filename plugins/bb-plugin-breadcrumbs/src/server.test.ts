import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import plugin from "./server";

const disposeHosts: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(disposeHosts.splice(0).map((dispose) => dispose()));
});

function createPluginHarness() {
  const update = vi.fn().mockResolvedValue({});
  const deleteProject = vi.fn().mockResolvedValue({ ok: true });
  const host = createFakePluginHost({
    pluginId: "breadcrumbs",
    sdk: {
      projects: { update, delete: deleteProject },
    },
  });
  disposeHosts.push(() => host.harness.lifecycle.dispose());

  plugin(host.bb);
  return { ...host, update, deleteProject };
}

describe("project action RPC", () => {
  it("renames projects through the bb SDK", async () => {
    const { harness, update } = createPluginHarness();

    await expect(
      harness.behavior.callRpc("renameProject", {
        projectId: "proj_1",
        name: "Renamed project",
      }),
    ).resolves.toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      projectId: "proj_1",
      name: "Renamed project",
    });
  });

  it("removes projects through the bb SDK", async () => {
    const { harness, deleteProject } = createPluginHarness();

    await expect(
      harness.behavior.callRpc("removeProject", { projectId: "proj_1" }),
    ).resolves.toEqual({ ok: true });
    expect(deleteProject).toHaveBeenCalledWith({ projectId: "proj_1" });
  });

  it("rejects invalid rename input at the RPC boundary", async () => {
    const { harness, update } = createPluginHarness();

    await expect(
      harness.behavior.callRpc("renameProject", {
        projectId: "proj_1",
        name: "   ",
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect(update).not.toHaveBeenCalled();
  });
});
