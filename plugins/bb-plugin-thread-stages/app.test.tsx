// @vitest-environment jsdom
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { describe, expect, it } from "vitest";

describe("thread stages app registration", () => {
  it("registers the thread list and lifecycle-managed shortcuts", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.threadLists).toHaveLength(1);
    expect(app.threadLists[0]).toMatchObject({
      id: "workflow-stage",
      title: "Thread stages",
    });
    expect(app.contentScripts).toHaveLength(1);
    expect(app.contentScripts[0]).toMatchObject({ id: "workflow-shortcuts" });
  });
});
