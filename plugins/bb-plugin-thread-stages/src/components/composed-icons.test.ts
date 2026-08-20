import { describe, expect, it } from "vitest";
import {
  AlbumNotFound01Icon,
  BanIcon,
  CircleIcon,
} from "@hugeicons/core-free-icons";
import {
  BlockedCircleIcon,
  ListViewOffIcon,
  SectionAddIcon,
} from "./composed-icons";

describe("composed icons", () => {
  it("expands the Ban icon to the standard stage circle", () => {
    expect(BlockedCircleIcon[0]).toEqual(CircleIcon[0]);
    expect(BlockedCircleIcon[1]?.[1]).toEqual({
      ...BanIcon[1]?.[1],
      d: "M5 5L19 19",
    });
  });

  it("interrupts the list rows around Hugeicons' not-found stroke", () => {
    const slash = AlbumNotFound01Icon.at(-1);
    expect(slash?.[1].d).toBe("M2 2L22 22");
    expect(ListViewOffIcon.map(([, attributes]) => attributes.d)).toEqual([
      "M2 3.4V4.6C2 5.75827 2.24173 6 3.4 6H6M6 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H10",
      "M10 10H3.4C2.24173 10 2 10.2417 2 11.4V12.6C2 13.7583 2.24173 14 3.4 14H14M14 10H20.6C21.7583 10 22 10.2417 22 11.4V12.6C22 13.7583 21.7583 14 20.6 14H18",
      "M18 18H3.4C2.24173 18 2 18.2417 2 19.4V20.6C2 21.7583 2.24173 22 3.4 22H22",
      "M2 2L22 22",
    ]);
    expect(ListViewOffIcon[3]).toEqual(slash);
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
