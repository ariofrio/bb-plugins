// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

  it("groups project and section filters under a Projects and sections trigger", () => {
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Projects and sections",
    });
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
    ).toEqual(["Show all threads", "Alpha", "Personal", "Waiting"]);
  });

  it("reports project, section, and clear selections", () => {
    const onChange = vi.fn();
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={{ kind: "project", id: "proj_alpha" }}
        onChange={onChange}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Projects and sections: Alpha",
    });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Waiting" }));

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Show all threads" }),
    );

    expect(onChange).toHaveBeenNthCalledWith(1, {
      kind: "section",
      id: "section_waiting",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it("omits project and section groups independently when they are empty", () => {
    const sharedProps = {
      value: null,
      onChange: () => {},
      onNewProject: () => {},
      onNewSection: () => {},
    } as const;
    const { rerender } = render(
      <ThreadFilter {...sharedProps} projects={[]} sections={sections} />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects and sections" }),
      { key: "Enter" },
    );
    expect(screen.queryByText("Projects")).toBeNull();
    expect(screen.getByText("Sections")).toBeDefined();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    rerender(
      <ThreadFilter {...sharedProps} projects={projects} sections={[]} />,
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects" }),
      { key: "Enter" },
    );
    const projectsOnlyMenu = screen.getByRole("menu");
    expect(within(projectsOnlyMenu).getByText("Projects")).toBeDefined();
    expect(within(projectsOnlyMenu).queryByText("Sections")).toBeNull();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    rerender(
      <ThreadFilter
        projects={projects}
        sections={[]}
        value={{ kind: "project", id: "proj_alpha" }}
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Projects: Alpha" }),
    ).toBeDefined();
  });

  it("runs the two creation actions without opening the filter menu", () => {
    const onNewProject = vi.fn();
    const onNewSection = vi.fn();
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        onChange={() => {}}
        onNewProject={onNewProject}
        onNewSection={onNewSection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "New project" }));
    fireEvent.click(screen.getByRole("button", { name: "New section" }));

    expect(onNewProject).toHaveBeenCalledOnce();
    expect(onNewSection).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows built-in-style tooltips for the creation actions", async () => {
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );

    const newProject = screen.getByRole("button", { name: "New project" });
    fireEvent.focus(newProject);
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "New project",
    );

    fireEvent.blur(newProject);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());

    fireEvent.focus(screen.getByRole("button", { name: "New section" }));
    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "New section",
    );
  });

  it("keeps stage counts out of the sidebar menu", () => {
    render(
      <ThreadFilter
        projects={projects}
        sections={sections}
        value={null}
        onChange={() => {}}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects and sections" }),
      { key: "Enter" },
    );
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Show stage counts" }),
    ).toBeNull();
  });
});
