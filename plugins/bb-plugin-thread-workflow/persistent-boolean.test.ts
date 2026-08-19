import { describe, expect, it } from "vitest";
import { parseStoredBoolean } from "./persistent-boolean";

describe("parseStoredBoolean", () => {
  it("uses the default for missing or malformed values", () => {
    expect(parseStoredBoolean(null, true)).toBe(true);
    expect(parseStoredBoolean("maybe", false)).toBe(false);
  });

  it("loads explicitly stored booleans", () => {
    expect(parseStoredBoolean("true", false)).toBe(true);
    expect(parseStoredBoolean("false", true)).toBe(false);
  });
});
