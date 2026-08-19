// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IconPicker } from "./IconPicker";

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
  it("opens as a non-modal editor", () => {
    render(
      <IconPicker
        catalog={[]}
        loading={false}
        open
        onOpenChange={vi.fn()}
        projectName="Example project"
        icon="Folder"
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
