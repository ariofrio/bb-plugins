import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { afterEach, describe, expect, it } from "vitest";
import plugin from "./server";

const disposeHosts: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(disposeHosts.splice(0).map((dispose) => dispose()));
});

function createPluginHarness() {
  const host = createFakePluginHost({ pluginId: "thread-stages" });
  plugin(host.bb);
  disposeHosts.push(() => host.harness.lifecycle.dispose());
  return host.harness;
}

describe("thread stages plugin API", () => {
  it("registers its complete host-facing contract", () => {
    const harness = createPluginHarness();

    expect(harness.inspection.registrations.rpcMethods).toEqual([
      "listState",
      "listPreviews",
      "listPinnedThreadIds",
      "reorderPinnedThread",
      "searchThreads",
      "syncThreads",
      "moveThread",
      "setWorkflowStage",
      "reorderThread",
    ]);
    expect(
      harness.inspection.registrations.services.map(({ name }) => name),
    ).toEqual(["stage-automation", "thread-previews"]);
    expect(harness.inspection.registrations.cli?.name).toBe("thread-stages");
    expect(harness.inspection.registrations.threadEventHandlers).toMatchObject({
      "thread.active": 1,
      "thread.created": 1,
      "thread.deleted": 1,
      "thread.failed": 1,
      "thread.idle": 1,
    });
  });

  it("serves persisted state through the schema-validated RPC boundary", async () => {
    const harness = createPluginHarness();

    await expect(harness.behavior.callRpc("listState", null)).resolves.toEqual({
      assignments: [],
    });
    await expect(
      harness.behavior.callRpc("moveThread", {
        threadId: "",
        workflowStage: "Working",
        previousThreadId: null,
        nextThreadId: null,
      }),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("runs its CLI through host result normalization", async () => {
    const harness = createPluginHarness();

    await expect(harness.behavior.runCli(["--help"])).resolves.toMatchObject({
      exitCode: 0,
      stderr: "",
      stdout: expect.stringContaining("bb thread-stages [options] [command]"),
    });
  });
});
