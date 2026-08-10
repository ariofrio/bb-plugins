// Fails when a plugin's committed SDK declarations are stale or modified.
// `bb plugin build` never rewrites types/, so nothing else catches it.
// Usage: node scripts/verify-types.mjs [pluginDir]
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const pluginDirectory = resolve(process.argv[2] ?? process.cwd());

execFileSync("bb", ["plugin", "types", "--check", pluginDirectory], {
  stdio: "inherit",
});

const diff = spawnSync(
  "git",
  ["diff", "--no-ext-diff", "--exit-code", "--", "types"],
  { cwd: pluginDirectory, encoding: "utf8" },
);
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", "types"],
  { cwd: pluginDirectory, encoding: "utf8" },
).trim();

if (diff.status !== 0 || untracked) {
  if (diff.stdout) process.stderr.write(diff.stdout);
  if (diff.stderr) process.stderr.write(diff.stderr);
  if (untracked) {
    process.stderr.write(`Uncommitted declarations:\n${untracked}\n`);
  }
  process.stderr.write(
    "Committed declarations differ from Git. Run bb plugin types and commit types/.\n",
  );
  process.exit(1);
}

console.log("Committed declarations are current.");
