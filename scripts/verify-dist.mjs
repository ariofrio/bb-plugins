// Rebuilds a plugin from a clean dist/ and fails when the committed generated
// files differ from that build. Usage: node scripts/verify-dist.mjs [pluginDir]
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const pluginDirectory = resolve(process.argv[2] ?? process.cwd());

rmSync(resolve(pluginDirectory, "dist"), { recursive: true, force: true });
execFileSync("npm", ["run", "build"], {
  cwd: pluginDirectory,
  stdio: "inherit",
});

const diff = spawnSync(
  "git",
  ["diff", "--no-ext-diff", "--exit-code", "--", "dist", "types"],
  { cwd: pluginDirectory, encoding: "utf8" },
);
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", "dist", "types"],
  { cwd: pluginDirectory, encoding: "utf8" },
).trim();

if (diff.status !== 0 || untracked) {
  if (diff.stdout) process.stderr.write(diff.stdout);
  if (diff.stderr) process.stderr.write(diff.stderr);
  if (untracked) {
    process.stderr.write(`Uncommitted generated files:\n${untracked}\n`);
  }
  process.stderr.write(
    "Generated artifacts differ from a clean build. Run npm run build and commit dist/ and types/.\n",
  );
  process.exit(1);
}

console.log("Committed generated artifacts match a clean build.");
