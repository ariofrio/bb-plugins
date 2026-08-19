import { execFileSync, spawnSync } from "node:child_process";

const shouldPush = process.argv.includes("--push");
const releases = JSON.parse(process.env.RELEASES ?? "[]");
const target = process.env.TARGET_SHA ?? "";
const commitPattern = /^[0-9a-f]{40}$/;
const tagPattern = /^[a-z0-9][a-z0-9-]*\/v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

if (!commitPattern.test(target)) throw new Error("TARGET_SHA must be a full commit SHA");
if (!Array.isArray(releases) || releases.length === 0) {
  throw new Error("RELEASES must contain at least one release");
}

for (const release of releases) {
  if (!tagPattern.test(release.tag) || typeof release.message !== "string") {
    throw new Error(`Invalid release: ${JSON.stringify(release)}`);
  }
  const remote = spawnSync(
    "git",
    ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${release.tag}`],
    { encoding: "utf8" },
  );
  if (remote.status === 0) throw new Error(`Release tag already exists: ${release.tag}`);
  if (remote.status !== 2) {
    throw new Error(remote.stderr || `Could not inspect release tag ${release.tag}`);
  }
}

if (!shouldPush) {
  for (const release of releases) {
    process.stdout.write(`${release.tag} -> ${target}\n`);
  }
  process.exit(0);
}

for (const release of releases) {
  execFileSync(
    "git",
    ["tag", "-a", release.tag, target, "-m", release.message],
    { stdio: "inherit" },
  );
}

execFileSync(
  "git",
  [
    "push",
    "--atomic",
    "origin",
    ...releases.map((release) => `refs/tags/${release.tag}`),
  ],
  { stdio: "inherit" },
);
