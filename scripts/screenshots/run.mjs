// Regenerates every plugin screenshot from one seeded bb.
//
//   npm run screenshots            capture every shot
//   npm run screenshots -- --only project-icons
//   npm run screenshots -- --keep  leave the seeded bb running for inspection
//   npm run check:screenshots      report stale screenshots without capturing
//
// Capturing needs macOS, the bb desktop app installed, and Playwright's
// Chromium (npx playwright install chromium). The check needs neither.
import { execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPluginState, seed, writeManagedConfig } from "./fixture.mjs";
import { SHOTS } from "./shots.mjs";
import {
  LOCK_FILENAME,
  compareLock,
  fileDigest,
  inputDigest,
  readLock,
} from "./lock.mjs";
import { startStack } from "./stack.mjs";

const harnessDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(harnessDirectory, "../..");
const lockPath = join(harnessDirectory, LOCK_FILENAME);
const scratch = join(repositoryRoot, ".scratch/screenshots");
const bb = process.env.BB_CLI ?? "bb";

const options = parseArguments(process.argv.slice(2));
const shots = SHOTS.filter(
  (shot) => options.only === undefined || shot.id === options.only,
);
if (options.only !== undefined && shots.length === 0) {
  throw new Error(`No shot matches --only ${options.only}`);
}

function parseArguments(argv) {
  const parsed = { check: false, keep: false, only: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") parsed.check = true;
    else if (argument === "--keep") parsed.keep = true;
    else if (argument === "--only") {
      index += 1;
      parsed.only = argv[index];
    } else throw new Error(`Unknown option ${argument}`);
  }
  return parsed;
}

function shotFiles(shot) {
  return Object.fromEntries(
    shot.outputs.map((output) => [output, join(assetsDirectory(shot), output)]),
  );
}

/** A shot of the whole collection belongs to the repository, not to a plugin. */
function assetsDirectory(shot) {
  return shot.plugin === null
    ? join(repositoryRoot, "assets")
    : join(repositoryRoot, "plugins", shot.plugin, "assets");
}

function pluginDirectoriesFor(shot) {
  const directory = (plugin) => join(repositoryRoot, "plugins", plugin);
  return shot.plugin === null
    ? SHOTS.flatMap((each) => (each.plugin === null ? [] : [directory(each.plugin)]))
    : [directory(shot.plugin)];
}

function expectedLock() {
  const shotsEntry = {};
  for (const shot of SHOTS) {
    shotsEntry[shot.id] = {
      inputs: inputDigest({
        repositoryRoot,
        pluginDirectories: pluginDirectoriesFor(shot),
        harnessDirectory,
      }),
      files: Object.fromEntries(
        Object.entries(shotFiles(shot)).map(([name, path]) => [
          name,
          fileDigest(path),
        ]),
      ),
    };
  }
  return { shots: shotsEntry };
}

if (options.check) {
  const problems = compareLock({
    lock: readLock(lockPath),
    expected: expectedLock(),
  });
  if (problems.length > 0) {
    process.stderr.write(
      `Screenshots are out of date:\n${problems.map((problem) => `  ${problem}`).join("\n")}\n\nRun npm run screenshots on macOS to recapture them.\n`,
    );
    process.exit(1);
  }
  console.log(`${SHOTS.length} screenshots are current.`);
  process.exit(0);
}

mkdirSync(scratch, { recursive: true });
const logStream = createWriteStream(join(scratch, "bb.log"));
const dataDir = join(scratch, "data");
const workspaceRoot = join(scratch, "workspaces");

console.log("Starting an isolated bb…");
const stack = await startStack({ dataDir, logStream });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    void stack.stop().then(() => process.exit(1));
  });
}
writeManagedConfig({ dataDir, harnessDir: harnessDirectory });

console.log("Installing this repository's plugins…");
execFileSync(process.execPath, [join(repositoryRoot, "scripts/install-plugins.mjs")], {
  cwd: repositoryRoot,
  env: { ...stack.env, BB_CLI: bb },
  stdio: "inherit",
});

console.log("Seeding the fixture…");
const fixture = seed({ stack, workspaceRoot, bb });
await applyPluginState({ stack, projects: fixture.projects });

console.log("Capturing…");
// Imported here so the drift check runs without Playwright installed.
const { capture } = await import("./capture.mjs");
const captured = await capture({ stack, fixture, shots, shotFiles, repositoryRoot });

const lock = readLock(lockPath);
const expected = expectedLock();
for (const shot of captured) {
  lock.shots[shot.id] = expected.shots[shot.id];
  lock.shots[shot.id].files = Object.fromEntries(
    Object.entries(shotFiles(shot)).map(([name, path]) => [name, fileDigest(path)]),
  );
}
lock.bbVersion = execFileSync(bb, ["--version"], { encoding: "utf8" }).trim();
writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

console.log(
  `\nWrote ${captured.flatMap((shot) => shot.outputs).length} files:\n${captured
    .flatMap((shot) =>
      Object.values(shotFiles(shot)).map((path) => `  ${relative(repositoryRoot, path)}`),
    )
    .join("\n")}`,
);

if (options.keep) {
  console.log(
    `\nThe seeded bb is still running at ${stack.serverUrl}; the next run replaces it.`,
  );
} else {
  await stack.stop();
}
