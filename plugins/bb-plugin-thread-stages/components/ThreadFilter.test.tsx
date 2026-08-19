// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThreadFilter } from "./ThreadFilter";

afterEach(cleanup);

describe("ThreadFilter", () => {
  const projects = [
    { id: "proj_alpha", name: "Alpha", isPersonal: false },
    { id: "proj_personal", name: "Personal", isPersonal: true },
  ] as const;
  const sections = [{ id: "section_waiting", name: "Waiting" }] as const;

  it("groups project and section filters under a Filter threads trigger", () => {
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        showStageCounts
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
        onShowStageCountsChange={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Filter threads" });
    expect(trigger.querySelector('[data-icon="FilterMail"]')).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "New project" })
        .querySelector('[data-icon="FolderPlus"]'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "New section" })
        .querySelector('[data-icon="SectionAdd"]'),
    ).not.toBeNull();

    fireEvent.keyDown(trigger, { key: "Enter" });

    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Projects")).toBeDefined();
    expect(within(menu).getByText("Sections")).toBeDefined();
    expect(
      within(menu).getAllByRole("menuitemradio").map((item) => item.textContent),
    ).toEqual(["All threads", "Alpha", "Personal", "Waiting"]);
  });

  it("reports project, section, and clear selections", () => {
    const onChange = vi.fn();
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={{ kind: "project", id: "proj_alpha" }}
        showStageCounts
        onChange={onChange}
        onNewProject={() => {}}
        onNewSection={() => {}}
        onShowStageCountsChange={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Filter threads: Alpha",
    });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Waiting" }));

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "All threads" }));

    expect(onChange).toHaveBeenNthCalledWith(1, {
      kind: "section",
      id: "section_waiting",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it("omits project and section groups independently when they are empty", () => {
    const sharedProps = {
      value: null,
      showStageCounts: true,
      onChange: () => {},
      onNewProject: () => {},
      onNewSection: () => {},
      onShowStageCountsChange: () => {},
    } as const;
    const { rerender } = render(
      <ThreadFilter {...sharedProps} projects={[]} sections={sections} />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Filter threads" }), {
      key: "Enter",
    });
    expect(screen.queryByText("Projects")).toBeNull();
    expect(screen.getByText("Sections")).toBeDefined();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    rerender(
      <ThreadFilter {...sharedProps} projects={projects} sections={[]} />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Filter threads" }), {
      key: "Enter",
    });
    expect(screen.getByText("Projects")).toBeDefined();
    expect(screen.queryByText("Sections")).toBeNull();
  });

  it("runs the two creation actions without opening the filter menu", () => {
    const onNewProject = vi.fn();
    const onNewSection = vi.fn();
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        showStageCounts
        onChange={() => {}}
        onNewProject={onNewProject}
        onNewSection={onNewSection}
        onShowStageCountsChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    fireEvent.click(screen.getByRole("button", { name: "New section" }));

    expect(onNewProject).toHaveBeenCalledOnce();
    expect(onNewSection).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("toggles stage counts from the same sidebar menu", () => {
    const onShowStageCountsChange = vi.fn();
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        showStageCounts
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
        onShowStageCountsChange={onShowStageCountsChange}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Filter threads" }), {
      key: "Enter",
    });
    const counts = screen.getByRole("menuitemcheckbox", {
      name: "Show stage counts",
    });

    expect(counts.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(counts);
    expect(onShowStageCountsChange).toHaveBeenCalledWith(false);
  });
});
