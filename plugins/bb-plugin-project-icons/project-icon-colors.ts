import type { ProjectIconColor } from "./store";

/**
 * bb's theme exposes semantic tokens, not a named palette, so an explicitly
 * chosen color is an absolute one — the same way bb's favicon colors are. No
 * choice means the icon inherits the surrounding text color, which is what
 * keeps the default themed.
 */
export const PROJECT_ICON_COLOR_CLASSES: Record<ProjectIconColor, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  green: "text-green-500",
  teal: "text-teal-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
};

export function projectIconColorClass(color: ProjectIconColor | null): string {
  return color === null ? "" : PROJECT_ICON_COLOR_CLASSES[color];
}
