import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { buildReleasePlan } from "./release-plan.mjs";

const [base, head] = process.argv.slice(2);
const commitPattern = /^[0-9a-f]{40}$/;

if (!commitPattern.test(base ?? "") || !commitPattern.test(head ?? "")) {
  throw new Error("Usage: node scripts/plan-plugin-releases.mjs BASE_SHA HEAD_SHA");
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function manifestAt(commit, path) {
  try {
    return JSON.parse(git("show", `${commit}:${path}`));
  } catch (error) {
    if (error.status === 128) return null;
    throw error;
  }
}

const paths = git(
  "diff",
  "--name-only",
  "--diff-filter=AMR",
  base,
  head,
  "--",
  "plugins/*/package.json",
)
  .split("\n")
  .filter((path) => /^plugins\/[^/]+\/package\.json$/.test(path));

const releases = buildReleasePlan(
  paths.map((path) => ({
    directory: path.replace(/\/package\.json$/, ""),
    before: manifestAt(base, path),
    after: manifestAt(head, path),
  })),
);
const json = JSON.stringify(releases);

if (process.env.GITHUB_OUTPUT !== undefined) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `releases=${json}\ncount=${releases.length}\n`,
  );
}

process.stdout.write(`${JSON.stringify(releases, null, 2)}\n`);
