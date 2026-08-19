// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectFilter } from "./ProjectFilter";

afterEach(cleanup);

describe("ProjectFilter", () => {
  const projects = [
    { id: "proj_alpha", name: "Alpha", isPersonal: false },
    { id: "proj_personal", name: "Personal", isPersonal: true },
  ] as const;

  it("opens a compact menu with All projects and every available project", () => {
    render(
      <ProjectFilter projects={projects} value={null} onChange={() => {}} />,
    );

    const trigger = screen.getByRole("button", {
      name: "Filter by project: All projects",
    });
    expect(screen.queryByRole("combobox")).toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(
      screen.getAllByRole("menuitemradio").map((item) => item.textContent),
    ).toEqual(["All projects", "Alpha", "Personal"]);
    expect(
      screen.getByRole("menuitemradio", { name: "All projects" }).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("reports a project selection and maps All projects to null", () => {
    const onChange = vi.fn();
    render(
      <ProjectFilter
        projects={projects}
        value="proj_alpha"
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Filter by project: Alpha",
    });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Personal" }));

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "All projects" }));

    expect(onChange).toHaveBeenNthCalledWith(1, "proj_personal");
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });
});
