import { describe, expect, it } from "vitest";
import { parseStoredStringSet } from "./persistent-string-set";

describe("parseStoredStringSet", () => {
  it("normalizes renamed values before applying the allowlist", () => {
    expect(
      [
        ...parseStoredStringSet(
          '["Backlog","Done","Canceled","Blocked"]',
          new Set(["Deferred", "Idle", "Active", "Blocked", "Completed"]),
          undefined,
          new Map([
            ["Backlog", "Deferred"],
            ["Done", "Completed"],
            ["Canceled", "Completed"],
          ]),
        ),
      ],
    ).toEqual(["Deferred", "Completed", "Blocked"]);
  });

  it("loads unique strings and rejects malformed entries", () => {
    expect([
      ...parseStoredStringSet('["Completed",3,"Completed","Blocked"]'),
    ]).toEqual(["Completed", "Blocked"]);
    expect(parseStoredStringSet("not json").size).toBe(0);
  });

  it("filters values through a canonical allowlist", () => {
    expect([
      ...parseStoredStringSet(
        '["Completed","Not a status"]',
        new Set(["Completed", "Idle"]),
      ),
    ]).toEqual(["Completed"]);
  });

  it("uses defaults only when no value has been stored", () => {
    const allowedValues = new Set(["Deferred", "Idle", "Completed"]);
    const defaultValues = new Set(["Deferred", "Completed"]);

    expect([
      ...parseStoredStringSet(null, allowedValues, defaultValues),
    ]).toEqual(["Deferred", "Completed"]);
    expect([
      ...parseStoredStringSet("[]", allowedValues, defaultValues),
    ]).toEqual([]);
  });
});
