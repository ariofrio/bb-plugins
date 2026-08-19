import assert from "node:assert/strict";
import test from "node:test";

import { buildReleasePlan } from "./release-plan.mjs";

const plugin = (name, version, displayName = "Example plugin") => ({
  name,
  version,
  bb: { name: displayName },
});

test("plans a BB tag when a plugin version increases", () => {
  assert.deepEqual(
    buildReleasePlan([
      {
        directory: "plugins/bb-plugin-project-icons",
        before: plugin("bb-plugin-project-icons", "0.1.0", "Project icons"),
        after: plugin("bb-plugin-project-icons", "0.1.1", "Project icons"),
      },
    ]),
    [
      {
        id: "project-icons",
        directory: "plugins/bb-plugin-project-icons",
        packageName: "bb-plugin-project-icons",
        version: "0.1.1",
        tag: "project-icons/v0.1.1",
        title: "Project icons v0.1.1",
        message: "Release Project icons v0.1.1",
      },
    ],
  );
});

test("ignores package metadata changes when the version is unchanged", () => {
  assert.deepEqual(
    buildReleasePlan([
      {
        directory: "plugins/bb-plugin-project-icons",
        before: plugin("bb-plugin-project-icons", "0.1.0"),
        after: {
          ...plugin("bb-plugin-project-icons", "0.1.0"),
          description: "Updated description",
        },
      },
    ]),
    [],
  );
});

test("sorts independent plugin releases by id", () => {
  const plan = buildReleasePlan([
    {
      directory: "plugins/bb-plugin-thread-stages",
      before: plugin("bb-plugin-thread-stages", "0.5.0", "Thread stages"),
      after: plugin("bb-plugin-thread-stages", "0.6.0", "Thread stages"),
    },
    {
      directory: "plugins/bb-plugin-codex-theme",
      before: plugin("bb-plugin-codex-theme", "0.1.0", "Codex theme"),
      after: plugin("bb-plugin-codex-theme", "1.0.0", "Codex theme"),
    },
  ]);

  assert.deepEqual(
    plan.map(({ id, tag }) => ({ id, tag })),
    [
      { id: "codex-theme", tag: "codex-theme/v1.0.0" },
      { id: "thread-stages", tag: "thread-stages/v0.6.0" },
    ],
  );
});

test("rejects version decreases", () => {
  assert.throws(
    () =>
      buildReleasePlan([
        {
          directory: "plugins/bb-plugin-thread-stages",
          before: plugin("bb-plugin-thread-stages", "0.5.0"),
          after: plugin("bb-plugin-thread-stages", "0.4.0"),
        },
      ]),
    /must increase from 0\.5\.0 to 0\.4\.0/,
  );
});

test("rejects prereleases and newly added packages", () => {
  assert.throws(
    () =>
      buildReleasePlan([
        {
          directory: "plugins/bb-plugin-project-icons",
          before: plugin("bb-plugin-project-icons", "0.1.0"),
          after: plugin("bb-plugin-project-icons", "0.2.0-beta.1"),
        },
      ]),
    /stable X\.Y\.Z version/,
  );

  assert.throws(
    () =>
      buildReleasePlan([
        {
          directory: "plugins/bb-plugin-new-plugin",
          before: null,
          after: plugin("bb-plugin-new-plugin", "0.1.0"),
        },
      ]),
    /bootstrap release approval/,
  );
});
