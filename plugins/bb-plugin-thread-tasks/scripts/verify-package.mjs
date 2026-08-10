import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const expectedFiles = [
  "LICENSE",
  "README.md",
  "app.tsx",
  "dist/app.css",
  "dist/app.js",
  "dist/app.meta.json",
  "dist/server.js",
  "dist/server.js.map",
  "dist/server.meta.json",
  "package.json",
  "server.ts",
];
const temporaryDirectory = mkdtempSync(join(tmpdir(), "thread-tasks-pack-"));

try {
  const packOutput = execFileSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory],
    { encoding: "utf8" },
  );
  const [packed] = JSON.parse(packOutput);
  assert.ok(packed, "npm pack did not report an artifact");
  assert.deepEqual(
    packed.files.map(({ path }) => path).sort(),
    expectedFiles,
    "packed artifact contains missing or unexpected files",
  );

  const tarball = join(temporaryDirectory, packed.filename);
  const installPrefix = join(temporaryDirectory, "install");
  execFileSync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--prefix",
      installPrefix,
      tarball,
    ],
    { stdio: "inherit" },
  );

  const packageRoot = join(installPrefix, "node_modules", "bb-plugin-thread-tasks");
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const appMetadata = JSON.parse(readFileSync(join(packageRoot, "dist", "app.meta.json"), "utf8"));
  const serverMetadata = JSON.parse(readFileSync(join(packageRoot, "dist", "server.meta.json"), "utf8"));

  assert.equal(manifest.name, "bb-plugin-thread-tasks");
  assert.equal(manifest.license, "MIT");
  readFileSync(join(packageRoot, manifest.bb.server));
  readFileSync(join(packageRoot, manifest.bb.app));
  for (const metadata of [appMetadata, serverMetadata]) {
    assert.equal(metadata.pluginId, "thread-tasks");
    assert.equal(metadata.pluginVersion, manifest.version);
    assert.equal(metadata.sdkVersion, manifest.engines.bbPluginSdk.replace(/^\^/, ""));
  }

  console.log(`Verified packed artifact ${packed.filename}.`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
