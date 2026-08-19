// @vitest-environment jsdom
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { describe, expect, it } from "vitest";

describe("missing keyboard shortcuts app registration", () => {
  it("registers its composer bridge and lifecycle-managed content script", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.composerCustomizations).toHaveLength(1);
    expect(app.composerCustomizations[0]).toMatchObject({
      id: "navigation-bridge",
    });
    expect(app.contentScripts).toHaveLength(1);
    expect(app.contentScripts[0]).toMatchObject({
      id: "missing-keyboard-shortcuts",
    });
  });
});
