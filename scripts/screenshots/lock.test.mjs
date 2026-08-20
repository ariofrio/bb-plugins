import assert from "node:assert/strict";
import test from "node:test";
import { compareLock } from "./lock.mjs";

const expected = {
  shots: {
    "thread-stages": {
      inputs: "aaa",
      files: { "screenshot-dark.png": "111" },
    },
  },
};

test("a matching lock reports nothing", () => {
  assert.deepEqual(compareLock({ lock: expected, expected }), []);
});

test("a changed plugin makes its screenshot stale", () => {
  const problems = compareLock({
    lock: {
      shots: {
        "thread-stages": { inputs: "bbb", files: { "screenshot-dark.png": "111" } },
      },
    },
    expected,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /changed since it was captured/);
});

test("an edited image is reported separately from a changed plugin", () => {
  const problems = compareLock({
    lock: {
      shots: {
        "thread-stages": { inputs: "aaa", files: { "screenshot-dark.png": "999" } },
      },
    },
    expected,
  });
  assert.deepEqual(problems, ["thread-stages: screenshot-dark.png was edited outside the harness"]);
});

test("a missing image is reported", () => {
  const problems = compareLock({
    lock: { shots: { "thread-stages": { inputs: "aaa", files: {} } } },
    expected: {
      shots: {
        "thread-stages": { inputs: "aaa", files: { "screenshot-dark.png": null } },
      },
    },
  });
  assert.deepEqual(problems, ["thread-stages: screenshot-dark.png is missing"]);
});

test("a never-captured shot is reported", () => {
  assert.deepEqual(compareLock({ lock: { shots: {} }, expected }), [
    "thread-stages: never captured",
  ]);
});

test("a lock entry with no shot left is reported", () => {
  const problems = compareLock({
    lock: {
      shots: {
        ...expected.shots,
        removed: { inputs: "ccc", files: {} },
      },
    },
    expected,
  });
  assert.deepEqual(problems, ["removed: no longer a shot, but still in the lock"]);
});

test("a version bump leaves every digest alone", async (t) => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { inputDigest } = await import("./lock.mjs");

  const root = mkdtempSync(join(tmpdir(), "bb-plugins-lock-"));
  const pluginDirectory = join(root, "plugins/bb-plugin-example");
  const harnessDirectory = join(root, "scripts/screenshots");
  mkdirSync(join(pluginDirectory, "src"), { recursive: true });
  mkdirSync(harnessDirectory, { recursive: true });
  writeFileSync(join(pluginDirectory, "src/app.tsx"), "export default 1;\n");
  writeFileSync(join(harnessDirectory, "shots.mjs"), "export const SHOTS = [];\n");

  const manifest = (version, extra = {}) =>
    writeFileSync(
      join(pluginDirectory, "package.json"),
      `${JSON.stringify({ name: "bb-plugin-example", version, ...extra }, null, 2)}\n`,
    );
  const digest = () =>
    inputDigest({ repositoryRoot: root, pluginDirectory, harnessDirectory });

  manifest("0.2.1");
  const before = digest();

  manifest("0.3.0");
  assert.equal(digest(), before, "a release must not report screenshots stale");

  // Everything else in the manifest still counts: a dependency can move what a
  // plugin draws.
  manifest("0.3.0", { dependencies: { "@hugeicons/react": "^2.0.0" } });
  assert.notEqual(digest(), before);
});
