// @vitest-environment jsdom
import { loadPluginApp } from "@get-bb/plugin-sdk/testing/app";
import { describe, expect, it } from "vitest";

describe("project icon app registration", () => {
  it("registers one thread-header action through the plugin app contract", async () => {
    const app = await loadPluginApp(() => import("./app"));

    expect(app.threadHeaderActions).toHaveLength(1);
    expect(app.threadHeaderActions[0]).toMatchObject({
      id: "project-icon",
      title: "Project icon",
    });
  });
});
