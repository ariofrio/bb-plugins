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

  it("falls back to a legacy key when the current key is missing", () => {
    expect(parseStoredBoolean(null, false, "true")).toBe(true);
    expect(parseStoredBoolean(null, true, "false")).toBe(false);
    expect(parseStoredBoolean("false", true, "true")).toBe(false);
  });
});
