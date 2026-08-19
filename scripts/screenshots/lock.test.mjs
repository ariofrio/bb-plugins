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
