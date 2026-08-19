import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { afterEach, describe, expect, it } from "vitest";
import plugin from "./server";

const disposeHosts: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(disposeHosts.splice(0).map((dispose) => dispose()));
});

function createPluginHarness() {
  const host = createFakePluginHost({ pluginId: "project-icons" });
  plugin(host.bb);
  disposeHosts.push(() => host.harness.lifecycle.dispose());
  return host.harness;
}

describe("project icon plugin API", () => {
  it("registers its RPC methods and cleanup service", () => {
    const harness = createPluginHarness();

    expect(harness.inspection.registrations.rpcMethods).toEqual([
      "listIconCatalog",
      "listProjectIcons",
      "setProjectIcon",
      "clearProjectIcon",
    ]);
    expect(harness.inspection.registrations.services).toHaveLength(1);
    expect(harness.inspection.registrations.services[0]?.name).toBe(
      "project-icon-cleanup",
    );
  });

  it("persists an icon through the schema-validated RPC boundary", async () => {
    const harness = createPluginHarness();

    const updated = await harness.behavior.callRpc("setProjectIcon", {
      projectId: "proj_example",
      icon: "folder-01",
      color: "purple",
    });

    expect(updated).toMatchObject({
      icons: [
        {
          projectId: "proj_example",
          icon: "folder-01",
          color: "purple",
        },
      ],
    });
    expect(harness.inspection.realtimeSignals).toEqual([
      { channel: "icons-changed", payload: { projectId: "proj_example" } },
    ]);
  });

  it("rejects edits to the personal project's fixed icon", async () => {
    const harness = createPluginHarness();

    await expect(
      harness.behavior.callRpc("setProjectIcon", {
        projectId: "proj_personal",
        icon: "folder-01",
        color: null,
      }),
    ).rejects.toMatchObject({ code: "handler_error" });
    expect(harness.inspection.realtimeSignals).toEqual([]);
  });
});
