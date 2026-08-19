import type { IconSvgElement } from "@hugeicons/react";
import { Clock05Icon, SquareIcon } from "@hugeicons/core-free-icons";

// Hugeicons has no square counterpart for the dashed circle or the clock, so
// both are composed from the square outline. composed-icons.test.ts pins the
// pieces this borrows, because they move by index.
const [squareOutline] = SquareIcon;
const clockHands = Clock05Icon[1];

/** The square outline with the clock's hands left where the clock draws them. */
export const ClockSquareIcon: IconSvgElement = [squareOutline, clockHands];

/** The square outline, dashed like the dashed circle. */
export const DashedSquareIcon: IconSvgElement = [
  [
    squareOutline[0],
    {
      ...squareOutline[1],
      strokeDasharray: "3.5 3",
      strokeLinecap: "round",
    },
  ],
];

// Progress02 is the plugin's branding glyph. Hugeicons publishes the artwork,
// but the free icon-data package does not currently export it.
export const Progress02Icon: IconSvgElement = [
  [
    "circle",
    {
      cx: "12",
      cy: "12",
      r: "10",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      key: "0",
    },
  ],
  [
    "path",
    {
      d: "M19.5 12C19.5 11.0151 19.306 10.0398 18.9291 9.12987C18.5522 8.21993 17.9997 7.39314 17.3033 6.6967C16.6069 6.00026 15.7801 5.44781 14.8701 5.0709C13.9602 4.69399 12.9849 4.5 12 4.5L12 12H19.5Z",
      fill: "currentColor",
      key: "1",
    },
  ],
];

// Hugeicons has no list-with-plus glyph that leaves room for the plus. This
// matches BB's SectionAdd icon: the lower rows stop before the add symbol.
export const SectionAddIcon: IconSvgElement = [
  [
    "path",
    {
      d: "M2 3.4C2 2.24173 2.24173 2 3.4 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H3.4C2.24173 6 2 5.75827 2 4.6V3.4Z",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeWidth: "1.5",
      key: "0",
    },
  ],
  [
    "path",
    {
      d: "M2 11.4C2 10.2417 2.24173 10 3.4 10H10.6C11.7583 10 12 10.2417 12 11.4V12.6C12 13.7583 11.7583 14 10.6 14H3.4C2.24173 14 2 13.7583 2 12.6V11.4Z",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeWidth: "1.5",
      key: "1",
    },
  ],
  [
    "path",
    {
      d: "M2 19.4C2 18.2417 2.24173 18 3.4 18H10.6C11.7583 18 12 18.2417 12 19.4V20.6C12 21.7583 11.7583 22 10.6 22H3.4C2.24173 22 2 21.7583 2 20.6V19.4Z",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeWidth: "1.5",
      key: "2",
    },
  ],
  [
    "path",
    {
      d: "M18 13V21M22 17H14",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeWidth: "1.5",
      key: "3",
    },
  ],
];
