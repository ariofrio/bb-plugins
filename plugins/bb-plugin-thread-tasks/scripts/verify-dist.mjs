import { execFileSync, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
execFileSync("npm", ["run", "build"], { stdio: "inherit" });

const diff = spawnSync(
  "git",
  ["diff", "--no-ext-diff", "--exit-code", "--", "dist", "types"],
  { encoding: "utf8" },
);
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", "dist", "types"],
  { encoding: "utf8" },
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
