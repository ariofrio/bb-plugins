import { describe, expect, it } from "vitest";
import { threadIconOwner } from "./thread-owner";

const stored = [
  { kind: "section" as const, id: "sec_a" },
  { kind: "project" as const, id: "proj_a" },
];

describe("threadIconOwner", () => {
  it("is the section once that section has an icon of its own", () => {
    expect(
      threadIconOwner({ sectionId: "sec_a", projectId: "proj_a" }, stored),
    ).toEqual({ kind: "section", id: "sec_a" });
  });

  it("is the project while the section has none", () => {
    expect(
      threadIconOwner({ sectionId: "sec_b", projectId: "proj_a" }, stored),
    ).toEqual({ kind: "project", id: "proj_a" });
  });

  it("is the project for a thread in no section", () => {
    expect(
      threadIconOwner({ sectionId: null, projectId: "proj_a" }, stored),
    ).toEqual({ kind: "project", id: "proj_a" });
  });

  it("does not mistake a project's icon for its section's", () => {
    expect(
      threadIconOwner({ sectionId: "proj_a", projectId: "proj_a" }, stored),
    ).toEqual({ kind: "project", id: "proj_a" });
  });
});
