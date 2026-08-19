import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  type ReactElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  categoryLabel,
  iconLabel,
  searchIcons,
  type CatalogEntry,
} from "./icon-search";
import {
  projectIconColor,
  projectIconColorStyle,
} from "./project-icon-colors";
import { PROJECT_ICON_COLORS, type ProjectIconColor } from "./store";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  defaultIcon: string;
  color: ProjectIconColor | null;
  onPick: (icon: string) => void;
  onPickColor: (color: ProjectIconColor | null) => void;
  onReset: () => void;
  trigger: ReactElement;
}

export function IconPicker({
  catalog,
  loading,
  open,
  onOpenChange,
  projectName,
  icon,
  defaultIcon,
  color,
  onPick,
  onPickColor,
  onReset,
  trigger,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryOverflow, setCategoryOverflow] = useState({
    left: false,
    right: false,
  });
  const titleId = useId();
  const categoryScrollerRef = useRef<HTMLDivElement>(null);
  const categoryChipRefs = useRef(new Map<string, HTMLButtonElement>());
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const groups = useMemo(() => groupCatalog(catalog), [catalog]);
  const { results } = useMemo(
    () => searchIcons(catalog, query, null),
    [catalog, query],
  );
  const searching = query.trim().length > 0;
  const visibleGroups = searching ? groupCatalog(results) : groups;

  useEffect(() => {
    if (
      groups.length > 0 &&
      !groups.some(({ name }) => name === activeCategory)
    ) {
      setActiveCategory(groups[0]?.name ?? null);
    }
  }, [activeCategory, groups]);

  useEffect(() => {
    if (activeCategory === null) return;
    categoryChipRefs.current.get(activeCategory)?.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeCategory]);

  const updateCategoryOverflow = () => {
    const scroller = categoryScrollerRef.current;
    if (scroller === null) return;
    setCategoryOverflow({
      left: scroller.scrollLeft > 1,
      right:
        scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1,
    });
  };

  useEffect(() => {
    updateCategoryOverflow();
    window.addEventListener("resize", updateCategoryOverflow);
    return () => window.removeEventListener("resize", updateCategoryOverflow);
  }, [groups]);

  const scrollCategories = (direction: -1 | 1) => {
    categoryScrollerRef.current?.scrollBy({
      left: direction * 180,
      behavior: "smooth",
    });
  };

  const jumpToCategory = (name: string) => {
    setActiveCategory(name);
    sectionRefs.current.get(name)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const trackVisibleCategory = (scrollingElement: HTMLDivElement) => {
    const threshold = scrollingElement.getBoundingClientRect().top + 8;
    let next = groups[0]?.name ?? null;
    for (const { name } of groups) {
      const section = sectionRefs.current.get(name);
      if (
        section !== undefined &&
        section.getBoundingClientRect().top <= threshold
      ) {
        next = name;
      } else if (section !== undefined) break;
    }
    if (next !== null) setActiveCategory(next);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        aria-labelledby={titleId}
        mobileTitle={null}
      >
        <div className="flex h-[calc(var(--radix-popover-content-available-height)-2rem)] max-h-[32rem] flex-col gap-3 max-md:h-[calc(85dvh-3rem)] max-md:max-h-none">
          <PopoverTitle id={titleId} className="sr-only">
            Icon for {projectName}
          </PopoverTitle>

          <div className="flex items-center gap-2 py-1">
            <div
              role="group"
              aria-label="Color"
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <ColorSwatch
                label="Theme color"
                selected={color === null}
                onClick={() => onPickColor(null)}
                className="bg-muted-foreground"
              />
              {PROJECT_ICON_COLORS.map((swatch) => {
                const label = titleCase(swatch);
                return (
                  <ColorSwatch
                    key={swatch}
                    label={label}
                    selected={color === swatch}
                    onClick={() => onPickColor(swatch)}
                    style={{
                      backgroundColor: projectIconColor(swatch) ?? undefined,
                    }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Remove custom icon"
              onClick={onReset}
              disabled={icon === defaultIcon && color === null}
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-destructive transition-colors hover:bg-destructive/15 hover:text-destructive active:bg-destructive/20 disabled:invisible"
            >
              Remove
            </button>
          </div>

          <div className="relative">
            <Icon
              name="Search"
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search icons"
              autoFocus
              placeholder="Search icons"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-8"
            />
          </div>

          {!searching && groups.length > 0 ? (
            <nav
              aria-label="Icon categories"
              className="flex min-w-0 items-center gap-1"
            >
              <button
                type="button"
                aria-label="Previous categories"
                disabled={!categoryOverflow.left}
                onClick={() => scrollCategories(-1)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground disabled:opacity-30"
              >
                <Icon name="ChevronLeft" aria-hidden className="size-3.5" />
              </button>
              <div
                ref={categoryScrollerRef}
                onScroll={updateCategoryOverflow}
                className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {groups.map(({ name }) => (
                  <CategoryChip
                    key={name}
                    active={activeCategory === name}
                    label={titleCase(categoryLabel(name))}
                    onClick={() => jumpToCategory(name)}
                    buttonRef={(node) => {
                      if (node === null) categoryChipRefs.current.delete(name);
                      else categoryChipRefs.current.set(name, node);
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next categories"
                disabled={!categoryOverflow.right}
                onClick={() => scrollCategories(1)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground disabled:opacity-30"
              >
                <Icon name="ChevronRight" aria-hidden className="size-3.5" />
              </button>
            </nav>
          ) : null}

          <div
            role="region"
            aria-label={searching ? "Icon search results" : "Icon catalog"}
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            onScroll={(event) => {
              if (!searching) trackVisibleCategory(event.currentTarget);
            }}
          >
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading icons…
              </p>
            ) : searching && results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No icons match.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleGroups.map(({ name, entries }) => {
                  const headingId = `${titleId}-${name}`;
                  return (
                    <section
                      key={name}
                      ref={(node) => {
                        if (node === null) sectionRefs.current.delete(name);
                        else sectionRefs.current.set(name, node);
                      }}
                      aria-labelledby={headingId}
                      className="scroll-mt-1 [content-visibility:auto] [contain-intrinsic-size:auto_12rem]"
                    >
                      <h3
                        id={headingId}
                        className="mb-1.5 text-xs font-medium text-muted-foreground"
                      >
                        {titleCase(categoryLabel(name))}
                      </h3>
                      <IconGrid
                        entries={entries}
                        icon={icon}
                        color={color}
                        onPick={onPick}
                      />
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorSwatch({
  label,
  selected,
  onClick,
  className = "",
  style,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      onClick={onClick}
      style={style}
      className={`size-5 shrink-0 rounded-full border transition-colors ${className} ${
        selected
          ? "ring-2 ring-ring ring-offset-1 ring-offset-background"
          : "border-transparent"
      }`}
    />
  );
}

function CategoryChip({
  active,
  label,
  onClick,
  buttonRef,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs transition-colors ${
        active
          ? "bg-state-active text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function IconGrid({
  entries,
  icon,
  color,
  onPick,
}: {
  entries: readonly CatalogIcon[];
  icon: string;
  color: ProjectIconColor | null;
  onPick: (icon: string) => void;
}) {
  return (
    <div className="grid grid-cols-9 gap-0.5 max-md:grid-cols-8">
      {entries.map((entry) => (
        <button
          key={entry.name}
          type="button"
          title={iconLabel(entry.name)}
          aria-label={iconLabel(entry.name)}
          aria-pressed={entry.name === icon}
          onClick={() => onPick(entry.name)}
          style={projectIconColorStyle(color)}
          className={`flex aspect-square items-center justify-center rounded-md transition-colors ${
            entry.name === icon
              ? "bg-state-active"
              : color === null
                ? "text-muted-foreground hover:bg-state-hover hover:text-foreground"
                : "hover:bg-state-hover"
          }`}
        >
          <HugeiconsIcon
            icon={entry.glyph}
            className="size-[18px]"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function groupCatalog(catalog: readonly CatalogIcon[]) {
  const byCategory = new Map<string, CatalogIcon[]>();
  for (const entry of catalog) {
    const entries = byCategory.get(entry.category) ?? [];
    entries.push(entry);
    byCategory.set(entry.category, entries);
  }
  return [...byCategory.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, entries]) => ({ name, entries }));
}

function titleCase(value: string): string {
  if (value.toLowerCase() === "ai") return "AI";
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
