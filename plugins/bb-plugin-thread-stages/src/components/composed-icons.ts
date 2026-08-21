import type { IconSvgElement } from "@hugeicons/react";
import {
  AlbumNotFound01Icon,
  BanIcon,
  CheckmarkCircle02Icon,
  Progress02Icon,
} from "@hugeicons/core-free-icons";

const standardCirclePath = CheckmarkCircle02Icon[0];
const banSlash = BanIcon[1];

/** Active's progress ring with its inner progress circle fully filled. */
export const CompletedProgressIcon: IconSvgElement = [
  Progress02Icon[0],
  [
    "circle",
    {
      cx: "12",
      cy: "12",
      r: "7.5",
      fill: "currentColor",
      key: "1",
    },
  ],
];

/** Radius-10 Ban painted as one path so translucent strokes do not compound. */
export const BlockedCircleIcon: IconSvgElement = [
  [
    standardCirclePath[0],
    {
      ...standardCirclePath[1],
      d: `${standardCirclePath[1].d}M5 5L19 19`,
      strokeLinecap: banSlash[1].strokeLinecap,
      strokeLinejoin: banSlash[1].strokeLinejoin,
    },
  ],
];

// Hugeicons' no/not-found family interrupts the underlying artwork around a
// final top-left-to-bottom-right stroke. These list rows use the same gaps.
const notFoundSlash = AlbumNotFound01Icon[3];

/** List view with its row outlines interrupted around the not-found slash. */
export const ListViewOffIcon: IconSvgElement = [
  [
    "path",
    {
      d: "M2 3.4V4.6C2 5.75827 2.24173 6 3.4 6H6M6 2H20.6C21.7583 2 22 2.24173 22 3.4V4.6C22 5.75827 21.7583 6 20.6 6H10",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "0",
    },
  ],
  [
    "path",
    {
      d: "M10 10H3.4C2.24173 10 2 10.2417 2 11.4V12.6C2 13.7583 2.24173 14 3.4 14H14M14 10H20.6C21.7583 10 22 10.2417 22 11.4V12.6C22 13.7583 21.7583 14 20.6 14H18",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "1",
    },
  ],
  [
    "path",
    {
      d: "M18 18H3.4C2.24173 18 2 18.2417 2 19.4V20.6C2 21.7583 2.24173 22 3.4 22H22",
      stroke: "currentColor",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: "1.5",
      key: "2",
    },
  ],
  notFoundSlash,
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
