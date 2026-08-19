import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const pluginsDirectory = join(repositoryRoot, "plugins");
const rootLockfilePath = join(repositoryRoot, "package-lock.json");
const rootLockfile = JSON.parse(readFileSync(rootLockfilePath, "utf8"));
const manifestKeys = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "engines",
];

for (const entry of readdirSync(pluginsDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join(pluginsDirectory, entry.name);
  const manifestPath = join(directory, "package.json");
  const lockfilePath = join(directory, "package-lock.json");
  let manifest;
  let lockfile;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }

  if (lockfile.name !== manifest.name || lockfile.packages?.[""] === undefined) {
    throw new Error(`${entry.name} has an incompatible package-lock.json`);
  }

  lockfile.version = manifest.version;
  lockfile.packages[""].version = manifest.version;
  const workspacePath = `plugins/${entry.name}`;
  const workspacePackage = rootLockfile.packages?.[workspacePath];
  if (workspacePackage === undefined) {
    throw new Error(`Root package-lock.json is missing ${workspacePath}`);
  }
  workspacePackage.version = manifest.version;
  for (const key of manifestKeys) {
    if (manifest[key] === undefined) delete lockfile.packages[""][key];
    else lockfile.packages[""][key] = manifest[key];
    if (manifest[key] === undefined) delete workspacePackage[key];
    else workspacePackage[key] = manifest[key];
  }
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

writeFileSync(rootLockfilePath, `${JSON.stringify(rootLockfile, null, 2)}\n`);
