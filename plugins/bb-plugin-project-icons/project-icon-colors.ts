import type { ProjectIconColor } from "./store";

/**
 * Hue anchors only. A fixed palette cannot stay legible across bb's themes —
 * measured against each built-in theme's canvas, flat 500-weight colors fall to
 * about 1.7:1 on every light theme — so the chosen hue is mixed into the
 * theme's own foreground. That keeps the icon roughly as readable as the text
 * beside it, in any theme and either mode, which is the same `color-mix`
 * approach bb's themes use to derive their muted tones.
 */
const PROJECT_ICON_HUES: Record<ProjectIconColor, string> = {
  red: "oklch(0.637 0.237 25.331)",
  orange: "oklch(0.705 0.213 47.604)",
  yellow: "oklch(0.795 0.184 86.047)",
  green: "oklch(0.723 0.219 149.579)",
  teal: "oklch(0.704 0.14 182.503)",
  blue: "oklch(0.623 0.214 259.815)",
  purple: "oklch(0.627 0.265 303.9)",
  pink: "oklch(0.656 0.241 354.308)",
};

/** How much of the hue survives the mix; the rest is the theme's foreground. */
const HUE_WEIGHT = "45%";

export function projectIconColor(color: ProjectIconColor | null): string | null {
  if (color === null) return null;
  return `color-mix(in oklch, ${PROJECT_ICON_HUES[color]} ${HUE_WEIGHT}, var(--foreground))`;
}

/** Inline so it survives outside the plugin's `@scope` root, such as bb's header. */
export function projectIconColorStyle(
  color: ProjectIconColor | null,
): { color: string } | undefined {
  const value = projectIconColor(color);
  return value === null ? undefined : { color: value };
}
