// What each committed screenshot was captured from, so CI can tell a stale
// screenshot from a current one without re-rendering anything. Regeneration is
// macOS-only, so the check reports drift instead of trying to fix it.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const LOCK_FILENAME = "screenshots.lock.json";

function hashFile(hash, path) {
  hash.update(readFileSync(path));
}

/**
 * Skips what cannot change a picture: build output, and the harness's own lock
 * and tests — the lock in particular is written by every capture, so hashing it
 * would report drift the moment a capture finished.
 */
function ignored(name) {
  return (
    name === "node_modules" ||
    name === "dist" ||
    name === LOCK_FILENAME ||
    name.endsWith(".test.mjs")
  );
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

/**
 * A screenshot is stale when a plugin it pictures changed, or when the harness
 * that framed it did. Both feed one digest per shot. A shot that pictures the
 * whole collection names every plugin, so any of them can stale it.
 */
export function inputDigest({ repositoryRoot, pluginDirectories, harnessDirectory }) {
  const hash = createHash("sha256");
  for (const directory of [
    ...pluginDirectories.map((plugin) => join(plugin, "src")),
    harnessDirectory,
  ]) {
    if (!existsSync(directory)) continue;
    for (const path of walk(directory).sort()) {
      hash.update(relative(repositoryRoot, path));
      hashFile(hash, path);
    }
  }
  for (const plugin of pluginDirectories) {
    hash.update(readFileSync(join(plugin, "package.json")));
  }
  return hash.digest("hex");
}

export function fileDigest(path) {
  return existsSync(path)
    ? createHash("sha256").update(readFileSync(path)).digest("hex")
    : null;
}

export function readLock(path) {
  if (!existsSync(path)) return { bbVersion: null, shots: {} };
  return JSON.parse(readFileSync(path, "utf8"));
}

export function compareLock({ lock, expected }) {
  const problems = [];
  for (const [id, entry] of Object.entries(expected.shots)) {
    const recorded = lock.shots[id];
    if (recorded === undefined) {
      problems.push(`${id}: never captured`);
      continue;
    }
    if (recorded.inputs !== entry.inputs) {
      problems.push(`${id}: the plugin or the capture spec changed since it was captured`);
    }
    for (const [file, digest] of Object.entries(entry.files)) {
      if (digest === null) problems.push(`${id}: ${file} is missing`);
      else if (recorded.files?.[file] !== digest) {
        problems.push(`${id}: ${file} was edited outside the harness`);
      }
    }
  }
  for (const id of Object.keys(lock.shots)) {
    if (expected.shots[id] === undefined) problems.push(`${id}: no longer a shot, but still in the lock`);
  }
  return problems;
}
