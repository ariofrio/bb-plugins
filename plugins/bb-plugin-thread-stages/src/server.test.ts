import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
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

    expect(harness.inspection.registrations.settingsDescriptors).toEqual({
      showStageCounts: {
        type: "boolean",
        label: "Show stage counts",
        description: "Show the number of root threads in each stage.",
        default: true,
      },
    });
    expect(harness.inspection.registrations.rpcMethods).toEqual([
      "createProjectFromFolder",
      "addProjectLocalPath",
      "createSection",
      "createSectionForThread",
      "deleteProject",
      "deleteSection",
      "listProjectActionStates",
      "listSections",
      "listState",
      "listPreviews",
      "listPinnedThreadIds",
      "reorderPinnedThread",
      "searchThreads",
      "setThreadSection",
      "syncThreads",
      "moveThread",
      "setWorkflowStage",
      "reorderThread",
      "renameProject",
      "renameSection",
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

  it("lists the sections available to thread actions", async () => {
    const list = vi.fn(async () => [
      { id: "section_1", name: "Now", createdAt: 1, updatedAt: 2 },
      { id: "section_2", name: "Later", createdAt: 3, updatedAt: 4 },
    ]);
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: { threadSections: { list } },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("listSections", null),
    ).resolves.toEqual({
      sections: [
        { id: "section_1", name: "Now" },
        { id: "section_2", name: "Later" },
      ],
    });
    expect(list).toHaveBeenCalledWith();
  });

  it("assigns and clears a thread section through the bb SDK", async () => {
    const update = vi.fn(async () => ({}));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: { threads: { update } },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("setThreadSection", {
        threadId: "thr_1",
        sectionId: "section_1",
      }),
    ).resolves.toEqual({ sectionId: "section_1" });
    await expect(
      host.harness.behavior.callRpc("setThreadSection", {
        threadId: "thr_1",
        sectionId: null,
      }),
    ).resolves.toEqual({ sectionId: null });
    expect(update).toHaveBeenNthCalledWith(1, {
      threadId: "thr_1",
      sectionId: "section_1",
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      threadId: "thr_1",
      sectionId: null,
    });
  });

  it("creates a section and assigns the requesting thread", async () => {
    const create = vi.fn(async () => ({
      id: "section_new",
      name: "Waiting",
      createdAt: 1,
      updatedAt: 1,
    }));
    const update = vi.fn(async () => ({}));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        threadSections: { create },
        threads: { update },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("createSectionForThread", {
        threadId: "thr_1",
        name: "  Waiting  ",
      }),
    ).resolves.toEqual({
      section: { id: "section_new", name: "Waiting" },
    });
    expect(create).toHaveBeenCalledWith({ name: "Waiting" });
    expect(update).toHaveBeenCalledWith({
      threadId: "thr_1",
      sectionId: "section_new",
    });
  });

  it("creates a standalone section for the filter action", async () => {
    const create = vi.fn(async () => ({
      id: "section_new",
      name: "Waiting",
      createdAt: 1,
      updatedAt: 1,
    }));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: { threadSections: { create } },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("createSection", { name: "  Waiting  " }),
    ).resolves.toEqual({
      section: { id: "section_new", name: "Waiting" },
    });
    expect(create).toHaveBeenCalledWith({ name: "Waiting" });
  });

  it("uses bb's primary-host folder picker to create a project", async () => {
    const config = vi.fn(async () => ({ primaryHostId: "host_primary" }));
    const pickFolder = vi.fn(async () => ({ path: "/work/Alpha" }));
    const create = vi.fn(async () => ({ id: "proj_alpha", name: "Alpha" }));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        hosts: { pickFolder },
        projects: { create },
        system: { config },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("createProjectFromFolder", null),
    ).resolves.toEqual({ project: { id: "proj_alpha", name: "Alpha" } });
    expect(pickFolder).toHaveBeenCalledWith({
      hostId: "host_primary",
      clientHostId: "host_primary",
    });
    expect(create).toHaveBeenCalledWith({
      name: "Alpha",
      source: {
        type: "local_path",
        hostId: "host_primary",
        path: "/work/Alpha",
      },
    });
  });

  it("does nothing when the New project folder picker is canceled", async () => {
    const create = vi.fn();
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        hosts: { pickFolder: vi.fn(async () => ({ path: null })) },
        projects: { create },
        system: {
          config: vi.fn(async () => ({ primaryHostId: "host_primary" })),
        },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("createProjectFromFolder", null),
    ).resolves.toEqual({ project: null });
    expect(create).not.toHaveBeenCalled();
  });

  it("reports whether each standard project can add a path on the primary host", async () => {
    const list = vi.fn(async () => [
      {
        id: "proj_alpha",
        name: "Alpha",
        kind: "standard",
        sources: [{ type: "local_path", hostId: "host_primary" }],
      },
      {
        id: "proj_beta",
        name: "Beta",
        kind: "standard",
        sources: [{ type: "local_path", hostId: "host_other" }],
      },
      { id: "proj_personal", name: "Personal", kind: "personal", sources: [] },
    ]);
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        projects: { list },
        system: {
          config: vi.fn(async () => ({ primaryHostId: "host_primary" })),
        },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("listProjectActionStates", null),
    ).resolves.toEqual({
      projects: [
        { id: "proj_alpha", canAddLocalPath: false },
        { id: "proj_beta", canAddLocalPath: true },
      ],
    });
  });

  it("renames and removes projects and sections through the bb SDK", async () => {
    const projectUpdate = vi.fn(async () => ({}));
    const projectDelete = vi.fn(async () => ({ ok: true as const }));
    const sectionUpdate = vi.fn(async () => ({}));
    const sectionDelete = vi.fn(async () => ({ ok: true as const }));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        projects: { update: projectUpdate, delete: projectDelete },
        threadSections: { update: sectionUpdate, delete: sectionDelete },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await host.harness.behavior.callRpc("renameProject", {
      projectId: "proj_alpha",
      name: "  Alpha two  ",
    });
    await host.harness.behavior.callRpc("renameSection", {
      sectionId: "section_1",
      name: "  Later  ",
    });
    await host.harness.behavior.callRpc("deleteProject", {
      projectId: "proj_alpha",
    });
    await host.harness.behavior.callRpc("deleteSection", {
      sectionId: "section_1",
    });

    expect(projectUpdate).toHaveBeenCalledWith({
      projectId: "proj_alpha",
      name: "Alpha two",
    });
    expect(sectionUpdate).toHaveBeenCalledWith({
      id: "section_1",
      name: "Later",
    });
    expect(projectDelete).toHaveBeenCalledWith({ projectId: "proj_alpha" });
    expect(sectionDelete).toHaveBeenCalledWith({ id: "section_1" });
  });

  it("adds a picked local path to an existing project", async () => {
    const add = vi.fn(async () => ({}));
    const pickFolder = vi.fn(async () => ({ path: "/work/Alpha" }));
    const host = createFakePluginHost({
      pluginId: "thread-stages",
      sdk: {
        hosts: { pickFolder },
        projects: {
          get: vi.fn(async () => ({ id: "proj_alpha", sources: [] })),
          sources: { add },
        },
        system: {
          config: vi.fn(async () => ({ primaryHostId: "host_primary" })),
        },
      },
    });
    plugin(host.bb);
    disposeHosts.push(() => host.harness.lifecycle.dispose());

    await expect(
      host.harness.behavior.callRpc("addProjectLocalPath", {
        projectId: "proj_alpha",
      }),
    ).resolves.toEqual({ added: true });
    expect(add).toHaveBeenCalledWith({
      projectId: "proj_alpha",
      type: "local_path",
      hostId: "host_primary",
      path: "/work/Alpha",
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
