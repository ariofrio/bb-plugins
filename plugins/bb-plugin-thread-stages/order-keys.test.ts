import { describe, expect, it } from "vitest";
import { createOrderKeyAfter, createOrderKeyBetween } from "./order-keys";

function expectBetween(
  key: string,
  previousKey: string | null,
  nextKey: string | null,
): void {
  if (previousKey !== null) expect(key > previousKey).toBe(true);
  if (nextKey !== null) expect(key < nextKey).toBe(true);
}

describe("order keys", () => {
  it("creates initial and appended keys in lexicographic order", () => {
    const first = createOrderKeyBetween({ previousKey: null, nextKey: null });
    const second = createOrderKeyAfter({ previousKey: first });
    const third = createOrderKeyAfter({ previousKey: second });
    expect([third, first, second].sort()).toEqual([first, second, third]);
  });

  it("creates keys before, between, and after generated keys", () => {
    const first = createOrderKeyBetween({ previousKey: null, nextKey: null });
    const second = createOrderKeyAfter({ previousKey: first });
    expectBetween(
      createOrderKeyBetween({ previousKey: null, nextKey: first }),
      null,
      first,
    );
    expectBetween(
      createOrderKeyBetween({ previousKey: first, nextKey: second }),
      first,
      second,
    );
    expectBetween(createOrderKeyAfter({ previousKey: second }), second, null);
  });

  it("creates dense keys around migrated zero-padded positions", () => {
    expect(
      createOrderKeyBetween({
        previousKey: null,
        nextKey: "0000000000000001",
      }),
    ).toBe("0000000000000000U");
    expectBetween(
      createOrderKeyBetween({
        previousKey: "0000000000000009",
        nextKey: "0000000000000010",
      }),
      "0000000000000009",
      "0000000000000010",
    );
  });

  it("rejects invalid or unrepresentable boundaries", () => {
    expect(() =>
      createOrderKeyBetween({ previousKey: "", nextKey: null }),
    ).toThrow("empty");
    expect(() =>
      createOrderKeyBetween({ previousKey: "U!", nextKey: null }),
    ).toThrow("Invalid order key digit");
    expect(() =>
      createOrderKeyBetween({ previousKey: "b", nextKey: "U" }),
    ).toThrow("sort before");
    expect(() =>
      createOrderKeyBetween({ previousKey: null, nextKey: "0" }),
    ).toThrow("sort before next");
  });
});
