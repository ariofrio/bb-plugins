import assert from "node:assert/strict";
import test from "node:test";

import { extractChangelogEntry } from "./release-notes.mjs";

const changelog = `# bb-plugin-icons

## 0.1.2

### Patch Changes

- 728ffc9: Group the icon picker by category.

## 0.1.1

### Patch Changes

- abc1234: Replace the icon dialog with a popover.
`;

test("extracts the requested version entry without its heading", () => {
  assert.equal(
    extractChangelogEntry(changelog, "0.1.1"),
    "### Patch Changes\n\n- abc1234: Replace the icon dialog with a popover.",
  );
});

test("stops the newest entry before the previous version heading", () => {
  assert.equal(
    extractChangelogEntry(changelog, "0.1.2"),
    "### Patch Changes\n\n- 728ffc9: Group the icon picker by category.",
  );
});

test("keeps every section of a multi-bump entry", () => {
  const entry = extractChangelogEntry(
    `# bb-plugin-thread-stages

## 0.6.0

### Minor Changes

- 32a4ddb: Rename Thread workflow to Thread stages.

### Patch Changes

- 9f0d1ac: Tighten the stage header spacing.

## 0.5.0
`,
    "0.6.0",
  );
  assert.equal(
    entry,
    "### Minor Changes\n\n- 32a4ddb: Rename Thread workflow to Thread stages.\n\n### Patch Changes\n\n- 9f0d1ac: Tighten the stage header spacing.",
  );
});

test("returns an empty entry when the version is missing", () => {
  assert.equal(extractChangelogEntry(changelog, "0.2.0"), "");
});

test("returns an empty entry when the changelog is missing", () => {
  assert.equal(extractChangelogEntry(undefined, "0.1.1"), "");
});
