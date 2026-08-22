// Capturing runs on the Node that CI installs, and refuses any other.
//
// On Node 26 the fixture seed dies with an undici EPIPE that names neither
// Node nor the harness, so a run on the wrong major reads as a broken bb
// rather than a broken toolchain. This is the only place that turns that back
// into a sentence.
//
// It sits here rather than beside the harness because every file in
// scripts/screenshots feeds the screenshot digest, and a guard that cannot
// move a pixel would report all six shots stale each time it was edited.
import { readFileSync } from "node:fs";

const wanted = readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim();
const running = process.versions.node.split(".")[0];

if (running !== wanted) {
  console.error(
    `Capturing needs Node ${wanted}; this is Node ${process.versions.node}.\n` +
      `.nvmrc holds the version CI installs — run "nvm use" and try again.`,
  );
  process.exit(1);
}
