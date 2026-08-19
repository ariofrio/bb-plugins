/** Reads a Changesets CHANGELOG.md entry, without its version heading. */
export function extractChangelogEntry(changelog, version) {
  const lines = (changelog ?? "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return "";

  const body = lines.slice(start + 1);
  const end = body.findIndex((line) => /^#{1,2} /.test(line));
  return (end === -1 ? body : body.slice(0, end)).join("\n").trim();
}
