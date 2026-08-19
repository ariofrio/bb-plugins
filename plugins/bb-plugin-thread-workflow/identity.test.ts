import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("plugin identity", () => {
  it("publishes the Thread workflow identity and skill", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    const skill = readFileSync("skills/thread-workflow/SKILL.md", "utf8");

    expect(manifest.name).toBe("bb-plugin-thread-workflow");
    expect(manifest.bb.name).toBe("Thread workflow");
    expect(manifest.bb.description).toContain("workflow stages");
    expect(skill).toContain("name: thread-workflow");
  });
});
