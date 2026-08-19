import { describe, expect, it } from "vitest";
import { Clock05Icon, SquareIcon } from "@hugeicons/core-free-icons";
import { ClockSquareIcon, DashedSquareIcon } from "./composed-icons";

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
});
