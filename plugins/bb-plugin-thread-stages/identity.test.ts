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
    expect(icon).toContain('viewBox="0 0 14 14"');
    expect(icon).toContain('color="#737373"');
    expect(icon.match(/currentColor/g)).toHaveLength(2);
    expect(icon).toContain('<circle cx="7" cy="7" r="5.4"');
    expect(icon).toContain(
      '<path d="M7 7 L7 2.4 A4.6 4.6 0 0 1 11.2 9.5 Z"',
    );
    expect(skill).toContain("name: thread-stages");
    expect(collection.plugins).toContainEqual({
      name: "thread-stages",
      source: "./plugins/bb-plugin-thread-stages",
    });
  });
});
