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
  assert.equal(marketplace.name, "ariofrio");
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
    if (manifest.bb.branding.icon.startsWith("./")) {
      assert.deepEqual(listing.icon, {
        url: `./${directory}/${manifest.bb.branding.icon.slice(2)}`,
      });
    } else {
      assert.equal(listing.icon, manifest.bb.branding.icon);
    }
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

test("shows one description for each plugin everywhere it appears", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const listings = new Map(marketplace.plugins.map((plugin) => [plugin.id, plugin]));

  for (const collectionPlugin of collection.plugins) {
    const directory = collectionPlugin.source.replace(/^\.\//, "");
    const manifest = await readJson(new URL(`../${directory}/package.json`, import.meta.url));
    const id = derivePluginId(manifest.name);
    const description = manifest.bb.description;

    assert.equal(
      manifest.description,
      description,
      `${id} package.json description must match its bb.description`,
    );
    assert.equal(
      listings.get(id).description,
      description,
      `${id} marketplace description must match its bb.description`,
    );

    // Asserted as presence rather than as markup, so the README can be laid
    // out however it reads best and still has to say the same thing the
    // manifest and the marketplace say.
    assert.ok(
      readme.includes(`plugins/${directory.split("/").pop()}#readme`),
      `README must link to ${directory}`,
    );
    assert.ok(
      readme.includes(manifest.bb.name),
      `${id} README must name it exactly as bb.name does`,
    );
    assert.ok(
      readme.includes(description),
      `${id} README description must match its bb.description`,
    );
  }
});

test("packages every plugin the same way and paints its icon in bb's muted foreground", async () => {
  for (const collectionPlugin of collection.plugins) {
    const directory = collectionPlugin.source.replace(/^\.\//, "");
    const manifest = await readJson(new URL(`../${directory}/package.json`, import.meta.url));
    const id = derivePluginId(manifest.name);

    assert.equal(manifest.repository.directory, directory, `${id} repository.directory`);
    assert.equal(
      manifest.homepage,
      `https://github.com/ariofrio/bb-plugins/tree/main/${directory}#readme`,
      `${id} homepage`,
    );
    assert.ok(manifest.files.includes("assets"), `${id} must publish assets/`);

    const icon = await readFile(
      new URL(`../${directory}/${manifest.bb.branding.icon.slice(2)}`, import.meta.url),
      "utf8",
    );
    assert.match(icon, /viewBox="0 0 24 24"/, `${id} icon must use a 24x24 viewBox`);
    assert.match(icon, /color="#525252"/, `${id} icon must use bb's muted foreground`);
    assert.match(
      icon,
      /@media \(prefers-color-scheme: dark\) \{ svg \{ color: #b7b7b7; \} \}/,
      `${id} icon must carry bb's muted foreground for dark mode`,
    );
  }
});
