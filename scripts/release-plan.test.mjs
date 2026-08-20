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
        directory: "plugins/bb-plugin-icons",
        before: plugin("bb-plugin-icons", "0.1.0", "Icons"),
        after: plugin("bb-plugin-icons", "0.1.1", "Icons"),
      },
    ]),
    [
      {
        id: "icons",
        directory: "plugins/bb-plugin-icons",
        packageName: "bb-plugin-icons",
        version: "0.1.1",
        tag: "icons/v0.1.1",
        title: "Icons v0.1.1",
        message: "Release Icons v0.1.1",
      },
    ],
  );
});

test("ignores package metadata changes when the version is unchanged", () => {
  assert.deepEqual(
    buildReleasePlan([
      {
        directory: "plugins/bb-plugin-icons",
        before: plugin("bb-plugin-icons", "0.1.0"),
        after: {
          ...plugin("bb-plugin-icons", "0.1.0"),
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
      directory: "plugins/bb-plugin-chatgpt-theme",
      before: plugin("bb-plugin-chatgpt-theme", "0.1.0", "ChatGPT theme"),
      after: plugin("bb-plugin-chatgpt-theme", "1.0.0", "ChatGPT theme"),
    },
  ]);

  assert.deepEqual(
    plan.map(({ id, tag }) => ({ id, tag })),
    [
      { id: "chatgpt-theme", tag: "chatgpt-theme/v1.0.0" },
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
          directory: "plugins/bb-plugin-icons",
          before: plugin("bb-plugin-icons", "0.1.0"),
          after: plugin("bb-plugin-icons", "0.2.0-beta.1"),
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
