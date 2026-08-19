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
