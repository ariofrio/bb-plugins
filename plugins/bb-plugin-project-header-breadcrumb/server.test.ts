import type { BbPluginApi } from "@bb/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import plugin from "./server";

interface ProjectRpcHandlers {
  renameProject(input: {
    projectId: string;
    name: string;
  }): Promise<{ ok: true }>;
  removeProject(input: { projectId: string }): Promise<{ ok: true }>;
}

function createPluginHarness() {
  const update = vi.fn().mockResolvedValue({});
  const deleteProject = vi.fn().mockResolvedValue({ ok: true });
  const registration: { handlers?: ProjectRpcHandlers } = {};
  const bb = {
    sdk: { projects: { update, delete: deleteProject } },
    rpc: {
      register(_contract: unknown, nextHandlers: ProjectRpcHandlers) {
        registration.handlers = nextHandlers;
      },
    },
  } as unknown as BbPluginApi;

  plugin(bb);
  if (registration.handlers === undefined) {
    throw new Error("RPC handlers were not registered");
  }
  return { handlers: registration.handlers, update, deleteProject };
}

describe("project action RPC", () => {
  it("renames projects through the bb SDK", async () => {
    const { handlers, update } = createPluginHarness();

    await expect(
      handlers.renameProject({
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
    const { handlers, deleteProject } = createPluginHarness();

    await expect(
      handlers.removeProject({ projectId: "proj_1" }),
    ).resolves.toEqual({ ok: true });
    expect(deleteProject).toHaveBeenCalledWith({ projectId: "proj_1" });
  });
});
