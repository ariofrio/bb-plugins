import { describe, expect, it } from "vitest";
import { Clock05Icon, SquareIcon } from "@hugeicons/core-free-icons";
import {
  ClockSquareIcon,
  DashedSquareIcon,
  SectionAddIcon,
} from "./composed-icons";

describe("composed icons", () => {
  it("borrows the pieces it means to borrow", () => {
    expect(SquareIcon).toHaveLength(1);
    expect(SquareIcon[0]?.[0]).toBe("path");
    // The clock's second path is its hands; the first is the dial.
    expect(Clock05Icon[1]?.[1].d).toBe("M12 8V12L14 14");
  });

  it("draws the clock's hands inside the square outline", () => {
    expect(ClockSquareIcon).toEqual([SquareIcon[0], Clock05Icon[1]]);
  });

  it("dashes the square outline without redrawing it", () => {
    expect(DashedSquareIcon).toHaveLength(1);
    const [tag, attributes] = DashedSquareIcon[0] ?? [];
    expect(tag).toBe("path");
    expect(attributes?.d).toBe(SquareIcon[0]?.[1].d);
    expect(attributes?.strokeDasharray).toBe("3.5 3");
  });

  it("keeps the section rows clear of the add symbol", () => {
    expect(SectionAddIcon).toHaveLength(4);
    expect(SectionAddIcon.map(([, attributes]) => attributes.d)).toEqual([
      "M2 3.4C2 2.24173 2.24173 2 3.4 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H3.4C2.24173 6 2 5.75827 2 4.6V3.4Z",
      "M2 11.4C2 10.2417 2.24173 10 3.4 10H10.6C11.7583 10 12 10.2417 12 11.4V12.6C12 13.7583 11.7583 14 10.6 14H3.4C2.24173 14 2 13.7583 2 12.6V11.4Z",
      "M2 19.4C2 18.2417 2.24173 18 3.4 18H10.6C11.7583 18 12 18.2417 12 19.4V20.6C12 21.7583 11.7583 22 10.6 22H3.4C2.24173 22 2 21.7583 2 20.6V19.4Z",
      "M18 13V21M22 17H14",
    ]);
  });
});
