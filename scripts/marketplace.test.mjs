import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { satisfies } from "semver";

import { derivePluginId } from "./plugin-id.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const marketplace = await readJson(new URL("../marketplace.json", import.meta.url));
const collection = await readJson(new URL("../.bb/plugins.json", import.meta.url));

test("publishes every repository plugin from its immutable release line", async () => {
  assert.equal(marketplace.$schema, "https://getbb.app/schemas/marketplace.schema.json");
  assert.equal(marketplace.schemaVersion, 1);
  assert.equal(marketplace.name, "ariofrio-bb-plugins");
  assert.equal(marketplace.displayName, "Andres Riofrio's bb plugins");

  const listings = new Map(marketplace.plugins.map((plugin) => [plugin.id, plugin]));
  assert.equal(listings.size, marketplace.plugins.length, "marketplace plugin ids must be unique");
  assert.deepEqual([...listings.keys()].sort(), collection.plugins.map(({ name }) => name).sort());

  for (const collectionPlugin of collection.plugins) {
    const directory = collectionPlugin.source.replace(/^\.\//, "");
    const manifest = await readJson(new URL(`../${directory}/package.json`, import.meta.url));
    const id = derivePluginId(manifest.name);
    const listing = listings.get(id);

    assert.ok(listing, `missing marketplace listing for ${id}`);
    assert.equal(collectionPlugin.name, id);
    assert.equal(listing.displayName, manifest.bb.name);
    assert.equal(listing.icon, manifest.bb.branding.icon);
    assert.match(listing.description, /\.$/);
    assert.deepEqual(listing.author, {
      name: "Andres Riofrio",
      github: "ariofrio",
      url: "https://github.com/ariofrio",
    });
    const { range, ...source } = listing.source.git;
    assert.deepEqual({ git: source }, {
      git: {
        url: "https://github.com/ariofrio/bb-plugins.git",
        subdir: directory,
        tagPrefix: `${id}/`,
      },
    });
    assert.equal(
      satisfies(manifest.version, range),
      true,
      `${id} version ${manifest.version} must satisfy marketplace range ${range}`,
    );
  }
});
