// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  StageOptionsMenu,
  ThreadFilterOptionsMenu,
} from "./SidebarOptionsMenu";

afterEach(cleanup);

describe("sidebar options menus", () => {
  it("offers the filter count choices and built-in-style hide action", () => {
    const onCountModeChange = vi.fn();
    const onHide = vi.fn();
    render(
      <ThreadFilterOptionsMenu
        countMode="Projects"
        onCountModeChange={onCountModeChange}
        onHide={onHide}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Projects and sections options",
      }),
      { key: "Enter" },
    );
    expect(
      screen
        .getByRole("menuitem", { name: "Hide from sidebar" })
        .querySelector('[data-icon="EyeOff"]'),
    ).not.toBeNull();

    fireEvent.keyDown(screen.getByRole("menuitem", { name: "Show count" }), {
      key: "ArrowRight",
    });
    const countMenu = screen.getAllByRole("menu")[1];
    expect(
      within(countMenu)
        .getAllByRole("menuitemradio")
        .map((item) => item.textContent),
    ).toEqual(["None", "Projects", "Sections", "Projects + sections"]);
    fireEvent.click(
      within(countMenu).getByRole("menuitemradio", { name: "Sections" }),
    );
    expect(onCountModeChange).toHaveBeenCalledWith("Sections");

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Projects and sections options",
      }),
      { key: "Enter" },
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Hide from sidebar" }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("offers one shared stage-count checkbox", () => {
    const onShowCountsChange = vi.fn();
    render(
      <StageOptionsMenu
        stage="Working"
        showCounts
        onShowCountsChange={onShowCountsChange}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Working stage options" }),
      { key: "Enter" },
    );
    const checkbox = screen.getByRole("menuitemcheckbox", {
      name: "Show stage counts",
    });
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(checkbox);
    expect(onShowCountsChange).toHaveBeenCalledWith(false);
  });
});
