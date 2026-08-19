// @vitest-environment jsdom
import { CircleIcon } from "@hugeicons/core-free-icons";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconPicker } from "./IconPicker";
import { projectIconColor } from "./project-icon-colors";

const catalog = [
  {
    name: "sparkles",
    category: "ai",
    tags: [],
    glyph: CircleIcon,
  },
  {
    name: "circle",
    category: "shapes",
    tags: [],
    glyph: CircleIcon,
  },
  {
    name: "rocket",
    category: "space",
    tags: ["launch"],
    glyph: CircleIcon,
  },
];

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(cleanup);

beforeEach(() => {
  mockMatchMedia(false);
});

describe("IconPicker", () => {
  it("offers theme color first without duplicating the selected header icon", () => {
    render(
      <IconPicker
        catalog={catalog}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="circle"
        defaultIcon="folder"
        color="red"
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    const swatches = within(screen.getByRole("group", { name: "Color" }))
      .getAllByRole("button");
    expect(swatches[0]).toBe(screen.getByRole("button", { name: "Theme color" }));
    expect(swatches[1]).toBe(screen.getByRole("button", { name: "Red" }));
    expect(screen.getByRole("button", { name: "circle" }).style.color).toBe(
      projectIconColor("red"),
    );
    expect(screen.queryByLabelText("Selected icon: circle")).toBeNull();
  });

  it("removes the icon and color customization together", () => {
    const onPickColor = vi.fn();
    const onReset = vi.fn();
    render(
      <IconPicker
        catalog={catalog}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="folder"
        defaultIcon="folder"
        color="red"
        onPick={vi.fn()}
        onPickColor={onPickColor}
        onReset={onReset}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove custom icon" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onPickColor).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Theme color" }));
    expect(onPickColor).toHaveBeenCalledWith(null);
  });

  it("keeps matching icons grouped by category while searching", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(
      <IconPicker
        catalog={catalog}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="circle"
        defaultIcon="folder"
        color={null}
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    const categories = screen.getByRole("navigation", {
      name: "Icon categories",
    });
    screen.getByRole("heading", { name: "AI" });
    screen.getByRole("heading", { name: "Shapes" });
    screen.getByRole("heading", { name: "Space" });

    fireEvent.click(within(categories).getByRole("button", { name: "Space" }));
    expect(scrollIntoView).toHaveBeenCalled();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search icons" }), {
      target: { value: "l" },
    });
    expect(
      screen.queryByRole("navigation", { name: "Icon categories" }),
    ).toBeNull();
    const searchResults = screen.getByRole("region", {
      name: "Icon search results",
    });
    within(searchResults).getByRole("heading", { name: "AI" });
    within(searchResults).getByRole("heading", { name: "Shapes" });
    within(searchResults).getByRole("heading", { name: "Space" });
    within(searchResults).getByRole("button", { name: "sparkles" });
    within(searchResults).getByRole("button", { name: "circle" });
    within(searchResults).getByRole("button", { name: "rocket" });
    expect(screen.queryByText(/Showing \d+ of \d+/)).toBeNull();
  });

  it("clears search with a plugin-rendered control", () => {
    render(
      <IconPicker
        catalog={catalog}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="circle"
        defaultIcon="folder"
        color={null}
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    const search = screen.getByRole("searchbox", { name: "Search icons" });
    fireEvent.change(search, { target: { value: "launch" } });
    expect(screen.queryByRole("button", { name: "circle" })).toBeNull();

    const clearSearch = screen.getByRole("button", { name: "Clear search" });
    expect(fireEvent.mouseDown(clearSearch)).toBe(false);
    fireEvent.click(clearSearch);

    expect(search).toHaveProperty("value", "");
    screen.getByRole("button", { name: "circle" });
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).toBeNull();
  });

  it("selects the category currently at the top of the scrolling catalog", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(
      <IconPicker
        catalog={catalog}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="circle"
        defaultIcon="folder"
        color={null}
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );
    scrollIntoView.mockClear();

    const catalogRegion = screen.getByRole("region", {
      name: "Icon catalog",
    });
    const shapesSection = screen.getByRole("region", { name: "Shapes" });
    const spaceSection = screen.getByRole("region", { name: "Space" });
    Object.defineProperty(catalogRegion, "scrollTop", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(shapesSection, "offsetTop", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(spaceSection, "offsetTop", {
      configurable: true,
      value: 300,
    });
    vi.spyOn(catalogRegion, "getBoundingClientRect").mockReturnValue({
      ...catalogRegion.getBoundingClientRect(),
      top: 100,
    });
    vi.spyOn(shapesSection, "getBoundingClientRect").mockReturnValue({
      ...shapesSection.getBoundingClientRect(),
      top: 80,
    });
    vi.spyOn(spaceSection, "getBoundingClientRect").mockReturnValue({
      ...spaceSection.getBoundingClientRect(),
      top: 105,
    });

    fireEvent.scroll(catalogRegion);

    expect(
      screen
        .getByRole("button", { name: "Space" })
        .getAttribute("aria-current"),
    ).toBe("true");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  });

  it("opens as a non-modal editor", () => {
    render(
      <IconPicker
        catalog={[]}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="Folder"
        defaultIcon="Folder"
        color={null}
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    screen.getByRole("dialog", { name: "Icon for Example project" });
    expect(getComputedStyle(document.body).pointerEvents).not.toBe("none");
  });

  it("announces one title in the compact drawer", () => {
    mockMatchMedia(true);
    render(
      <IconPicker
        catalog={[]}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="Folder"
        defaultIcon="Folder"
        color={null}
        onPick={vi.fn()}
        onPickColor={vi.fn()}
        onReset={vi.fn()}
        trigger={<button type="button">Change icon</button>}
      />,
    );

    expect(
      screen.getAllByRole("heading", { name: "Icon for Example project" }),
    ).toHaveLength(1);
  });
});
