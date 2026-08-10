/** Mirrors bb's derivePluginId(). */
export function derivePluginId(packageName) {
  const base = packageName.includes("/")
    ? packageName.split("/").at(-1)
    : packageName;
  return base
    .replace(/^bb-plugin-/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
}
