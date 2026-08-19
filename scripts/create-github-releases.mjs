import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { extractChangelogEntry } from "./release-notes.mjs";

const shouldPublish = process.argv.includes("--publish");
const releases = JSON.parse(process.env.RELEASES ?? "[]");
const tagPattern = /^[a-z0-9][a-z0-9-]*\/v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const directoryPattern = /^plugins\/[a-z0-9-]+$/;

if (!Array.isArray(releases) || releases.length === 0) {
  throw new Error("RELEASES must contain at least one release");
}

function readChangelog(directory) {
  try {
    return readFileSync(`${directory}/CHANGELOG.md`, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

const planned = releases.map((release) => {
  if (
    !tagPattern.test(release.tag) ||
    !directoryPattern.test(release.directory ?? "") ||
    typeof release.title !== "string" ||
    typeof release.message !== "string"
  ) {
    throw new Error(`Invalid release: ${JSON.stringify(release)}`);
  }

  const entry = extractChangelogEntry(readChangelog(release.directory), release.version);
  if (entry.length === 0) {
    process.stderr.write(
      `No ${release.directory}/CHANGELOG.md entry for ${release.version}; ` +
        `releasing ${release.tag} with its tag message\n`,
    );
  }

  return { ...release, notes: entry.length === 0 ? release.message : entry };
});

if (!shouldPublish) {
  for (const release of planned) {
    process.stdout.write(`${release.tag} — ${release.title}\n${release.notes}\n\n`);
  }
  process.exit(0);
}

const published = new Set(
  execFileSync("gh", ["release", "list", "--limit", "1000", "--json", "tagName", "--jq", ".[].tagName"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((tag) => tag.length > 0),
);

for (const release of planned) {
  if (published.has(release.tag)) {
    process.stdout.write(`Release already published: ${release.tag}\n`);
    continue;
  }

  execFileSync(
    "gh",
    [
      "release",
      "create",
      release.tag,
      "--verify-tag",
      "--title",
      release.title,
      "--notes",
      release.notes,
    ],
    { stdio: "inherit" },
  );
}
