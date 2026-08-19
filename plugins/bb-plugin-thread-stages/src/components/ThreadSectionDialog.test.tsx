// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThreadSectionDialog } from "./ThreadSectionDialog";

afterEach(() => {
  cleanup();
  document
    .querySelectorAll("[data-app-browser]")
    .forEach((element) => element.remove());
});

describe("ThreadSectionDialog", () => {
  it("centers inside the DOM area not covered by the in-app browser", () => {
    const browserPanel = document.createElement("div");
    browserPanel.setAttribute("data-app-browser", "");
    browserPanel.getBoundingClientRect = () =>
      ({ left: 600, width: 400, height: 800 }) as DOMRect;
    document.body.append(browserPanel);

    render(
      <ThreadSectionDialog
        open
        onCreate={async () => {}}
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByRole("dialog").style.left).toBe("300px");
  });

  it("creates a trimmed section and closes", async () => {
    const onCreate = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    render(
      <ThreadSectionDialog
        open
        onCreate={onCreate}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByText("New section")).toBeDefined();
    expect(screen.getByText("Create a section for threads.")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Section name"), {
      target: { value: "  Waiting  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create section" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Waiting"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open when the name is empty", async () => {
    const onCreate = vi.fn(async () => {});
    const onOpenChange = vi.fn();
    render(
      <ThreadSectionDialog
        open
        onCreate={onCreate}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create section" }));

    expect(await screen.findByText("Section name cannot be empty.")).toBeDefined();
    expect(onCreate).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
