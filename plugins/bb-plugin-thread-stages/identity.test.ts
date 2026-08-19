import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("plugin identity", () => {
  it("publishes the Thread stages identity and skill", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
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
    expect(skill).toContain("name: thread-stages");
    expect(collection.plugins).toContainEqual({
      name: "thread-stages",
      source: "./plugins/bb-plugin-thread-stages",
    });
  });
});
