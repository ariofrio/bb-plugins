import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useMemo, useState } from "react";
import {
  categoryLabel,
  iconLabel,
  searchIcons,
  type CatalogEntry,
} from "./icon-search";
import { PROJECT_ICON_COLOR_CLASSES } from "./project-icon-colors";
import { PROJECT_ICON_COLORS, type ProjectIconColor } from "./store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface CatalogIcon extends Omit<CatalogEntry, "export"> {
  glyph: IconSvgElement;
}

export interface IconPickerProps {
  catalog: readonly CatalogIcon[];
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  icon: string;
  color: ProjectIconColor | null;
  onPick: (icon: string) => void;
  onPickColor: (color: ProjectIconColor | null) => void;
  onReset: () => void;
}

export function IconPicker({
  catalog,
  loading,
  open,
  onOpenChange,
  projectName,
  icon,
  color,
  onPick,
  onPickColor,
  onReset,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () => [...new Set(catalog.map((entry) => entry.category))].sort(),
    [catalog],
  );
  const { results, total } = useMemo(
    () => searchIcons(catalog, query, category),
    [catalog, category, query],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Icon for {projectName}</DialogTitle>
          <DialogDescription>
            Pick an icon and an optional color for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {PROJECT_ICON_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={color === swatch}
                onClick={() => onPickColor(color === swatch ? null : swatch)}
                className={`size-5 rounded-full border transition-colors ${
                  PROJECT_ICON_COLOR_CLASSES[swatch]
                } bg-current ${
                  color === swatch
                    ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
                    : "border-transparent"
                }`}
              />
            ))}
            <button
              type="button"
              onClick={() => onPickColor(null)}
              className={`ml-1 rounded-md px-2 py-1 text-xs ${
                color === null
                  ? "bg-state-active text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Theme color
            </button>
            <button
              type="button"
              onClick={onReset}
              className="ml-auto rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          </div>

          <Input
            autoFocus
            placeholder="Search icons"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            <CategoryChip
              active={category === null}
              label="All"
              onClick={() => setCategory(null)}
            />
            {categories.map((name) => (
              <CategoryChip
                key={name}
                active={category === name}
                label={categoryLabel(name)}
                onClick={() => setCategory(category === name ? null : name)}
              />
            ))}
          </div>

          <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto max-md:grid-cols-6">
            {(results as CatalogIcon[]).map((entry) => {
              const glyph = entry.glyph;
              return (
                <button
                  key={entry.name}
                  type="button"
                  title={iconLabel(entry.name)}
                  aria-label={iconLabel(entry.name)}
                  aria-pressed={entry.name === icon}
                  onClick={() => onPick(entry.name)}
                  className={`flex aspect-square items-center justify-center rounded-md transition-colors ${
                    entry.name === icon
                      ? "bg-state-active text-foreground"
                      : "text-muted-foreground hover:bg-state-hover hover:text-foreground"
                  }`}
                >
                  <HugeiconsIcon icon={glyph} className="size-5" aria-hidden />
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {loading
              ? "Loading icons…"
              : total === 0
              ? "No icons match."
              : total > results.length
                ? `Showing ${results.length} of ${total} — keep typing to narrow.`
                  : `${total} ${total === 1 ? "icon" : "icons"}`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs capitalize transition-colors ${
        active
          ? "bg-state-active text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
