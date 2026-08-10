// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectBreadcrumb } from "./ProjectBreadcrumb";

afterEach(cleanup);

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe("ProjectBreadcrumb", () => {
  it("opens the project menu from the breadcrumb title", async () => {
    const { container } = render(
      <span data-project-header-breadcrumb-root="">
        <ProjectBreadcrumb projectName="bb-plugins" />
      </span>,
    );

    const trigger = screen.getByRole("button", {
      name: "bb-plugins actions",
    });
    expect(trigger.textContent).toBe("bb-plugins");
    expect(
      container.querySelector('[data-icon="ChevronRight"]'),
    ).not.toBeNull();

    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });

    expect(
      await screen.findByRole("menuitem", { name: "Project settings" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Remove" })).toBeTruthy();
  });
});
