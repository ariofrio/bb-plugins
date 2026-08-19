import { describe, expect, it } from "vitest";
import { parseStoredStringSet } from "./persistent-string-set";

describe("parseStoredStringSet", () => {
  it("loads unique strings and rejects malformed entries", () => {
    expect([...parseStoredStringSet('["Done",3,"Done","Blocked"]')]).toEqual([
      "Done",
      "Blocked",
    ]);
    expect(parseStoredStringSet("not json").size).toBe(0);
  });

  it("filters values through a canonical allowlist", () => {
    expect([
      ...parseStoredStringSet(
        '["Done","Not a status"]',
        new Set(["Done", "To do"]),
      ),
    ]).toEqual(["Done"]);
  });

  it("uses defaults only when no value has been stored", () => {
    const allowedValues = new Set(["Backlog", "To do", "Done"]);
    const defaultValues = new Set(["Backlog", "Done"]);

    expect([
      ...parseStoredStringSet(null, allowedValues, defaultValues),
    ]).toEqual(["Backlog", "Done"]);
    expect([
      ...parseStoredStringSet("[]", allowedValues, defaultValues),
    ]).toEqual([]);
  });
});
