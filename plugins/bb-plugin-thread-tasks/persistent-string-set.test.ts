import { describe, expect, it } from "vitest";
import { parseStoredStringSet } from "./persistent-string-set";

describe("parseStoredStringSet", () => {
  it("loads unique strings and rejects malformed entries", () => {
    expect([...parseStoredStringSet('["Done",3,"Done","Waiting"]')]).toEqual([
      "Done",
      "Waiting",
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
});
