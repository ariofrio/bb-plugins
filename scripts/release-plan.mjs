import { derivePluginId } from "./plugin-id.mjs";

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseStableVersion(version, packageName) {
  const match = stableVersionPattern.exec(version);
  if (match === null) {
    throw new Error(
      `${packageName} must use a stable X.Y.Z version; received ${JSON.stringify(version)}`,
    );
  }
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function buildReleasePlan(changes) {
  const releases = [];

  for (const { directory, before, after } of changes) {
    if (before === null) {
      throw new Error(
        `${directory} is new and requires separate bootstrap release approval`,
      );
    }
    if (after === null) continue;
    if (before.version === after.version) continue;
    if (before.name !== after.name) {
      throw new Error(`${directory} changed package name during a release`);
    }
    if (typeof after.bb?.name !== "string" || after.bb.name.length === 0) {
      throw new Error(`${directory} must declare bb.name before release`);
    }

    const previous = parseStableVersion(before.version, after.name);
    const next = parseStableVersion(after.version, after.name);
    if (compareVersions(next, previous) <= 0) {
      throw new Error(
        `${after.name} version must increase from ${before.version} to ${after.version}`,
      );
    }

    const id = derivePluginId(after.name);
    if (id.length === 0) {
      throw new Error(`${directory} produces an empty plugin id`);
    }

    const title = `${after.bb.name} v${after.version}`;

    releases.push({
      id,
      directory,
      packageName: after.name,
      version: after.version,
      tag: `${id}/v${after.version}`,
      title,
      message: `Release ${title}`,
    });
  }

  return releases.sort((left, right) => left.id.localeCompare(right.id));
}
