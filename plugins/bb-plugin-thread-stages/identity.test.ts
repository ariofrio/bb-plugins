import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("plugin identity", () => {
  it("publishes the Thread stages identity and skill", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    const icon = readFileSync("assets/icon.svg", "utf8");
    const skill = readFileSync("skills/thread-stages/SKILL.md", "utf8");
    const collection = JSON.parse(
      readFileSync("../../.bb/plugins.json", "utf8"),
    );

    expect(manifest.name).toBe("bb-plugin-thread-stages");
    expect(manifest.bb.name).toBe("Thread stages");
    expect(manifest.bb.description).toBe(
      "Organize root sidebar threads into ordered stages.",
    );
    expect(manifest.repository.directory).toBe(
      "plugins/bb-plugin-thread-stages",
    );
    expect(manifest.homepage).toContain("/plugins/bb-plugin-thread-stages");
    expect(manifest.bb.branding.icon).toBe("./assets/icon.svg");
    expect(manifest.files).toContain("assets");
    expect(icon).toContain('viewBox="0 0 24 24"');
    expect(icon).toContain('color="#737373"');
    expect(icon.match(/currentColor/g)).toHaveLength(2);
    expect(icon).toContain('<circle cx="12" cy="12" r="10"');
    expect(icon).toContain(
      '<path d="M19.5 12C19.5 11.0151 19.306 10.0398 18.9291 9.12987C18.5522 8.21993 17.9997 7.39314 17.3033 6.6967C16.6069 6.00026 15.7801 5.44781 14.8701 5.0709C13.9602 4.69399 12.9849 4.5 12 4.5L12 12H19.5Z"',
    );
    expect(skill).toContain("name: thread-stages");
    expect(collection.plugins).toContainEqual({
      name: "thread-stages",
      source: "./plugins/bb-plugin-thread-stages",
    });
  });
});
