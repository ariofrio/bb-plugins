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
      <ProjectFilter
        projects={projects}
        value={null}
        showStageCounts
        onChange={() => {}}
        onShowStageCountsChange={() => {}}
      />,
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
        showStageCounts
        onChange={onChange}
        onShowStageCountsChange={() => {}}
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

  it("toggles stage counts from the same sidebar menu", () => {
    const onShowStageCountsChange = vi.fn();
    render(
      <ProjectFilter
        projects={projects}
        value={null}
        showStageCounts
        onChange={() => {}}
        onShowStageCountsChange={onShowStageCountsChange}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", {
        name: "Filter by project: All projects",
      }),
      { key: "Enter" },
    );
    const counts = screen.getByRole("menuitemcheckbox", {
      name: "Show stage counts",
    });

    expect(counts.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(counts);
    expect(onShowStageCountsChange).toHaveBeenCalledWith(false);
  });
});
