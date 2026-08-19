// @vitest-environment jsdom
import {
  cleanup,
  act,
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
  const rocket = [["path", { d: "M1" }]] as const;
  const projects = [
    { id: "proj_alpha", name: "Alpha", isPersonal: false },
    { id: "proj_personal", name: "Personal", isPersonal: true },
  ] as const;
  const sections = [{ id: "section_waiting", name: "Waiting" }] as const;
  const actions = {
    onAddProjectLocalPath: vi.fn(),
    onOpenProjectSettings: vi.fn(),
    onRemoveProject: vi.fn(),
    onRemoveSection: vi.fn(),
    onRenameProject: vi.fn(),
    onRenameSection: vi.fn(),
  };

  it("uses a scoped sidebar label while keeping All in the menu option", () => {
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
    expect(
      trigger.querySelector('[data-icon="FolderLibrary"]'),
    ).not.toBeNull();
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
    ).toEqual([
      "All projects and sections",
      "Threads",
      "Alpha",
      "Uncategorized",
      "Waiting",
    ]);
    expect(
      within(menu)
        .getByRole("menuitemradio", { name: "All projects and sections" })
        .querySelector('[data-icon="FolderLibrary"]'),
    ).not.toBeNull();
    expect(
      within(menu)
        .getByRole("menuitemradio", { name: "Uncategorized" })
        .querySelector("svg"),
    ).toBeNull();
  });

  it("shows the selected project or section icon in the trigger", () => {
    const sharedProps = {
      projects,
      sections,
      onChange: () => {},
      onNewProject: () => {},
      onNewSection: () => {},
    } as const;
    const { rerender } = render(
      <ThreadFilter
        {...sharedProps}
        projectIcons={
          new Map([
            [
              "proj_alpha",
              { name: "rocket", glyph: rocket, color: "rgb(1, 2, 3)" },
            ],
          ])
        }
        value={{ kind: "project", id: "proj_alpha" }}
      />,
    );

    let trigger = screen.getByRole("button", {
      name: "Projects and sections: Alpha",
    });
    expect(trigger.querySelector('path[d="M1"]')).not.toBeNull();
    expect(trigger.querySelector("svg")?.style.color).toBe("rgb(1, 2, 3)");

    rerender(
      <ThreadFilter
        {...sharedProps}
        value={{ kind: "project", id: "proj_alpha" }}
      />,
    );
    trigger = screen.getByRole("button", {
      name: "Projects and sections: Alpha",
    });
    expect(trigger.querySelector('[data-icon="Folder"]')).not.toBeNull();

    rerender(
      <ThreadFilter
        {...sharedProps}
        value={{ kind: "project", id: "proj_personal" }}
      />,
    );
    trigger = screen.getByRole("button", {
      name: "Projects and sections: Threads",
    });
    expect(trigger.querySelector('[data-icon="Folder"]')).not.toBeNull();

    rerender(
      <ThreadFilter
        {...sharedProps}
        value={{ kind: "section", id: "section_waiting" }}
      />,
    );
    trigger = screen.getByRole("button", {
      name: "Projects and sections: Waiting",
    });
    expect(trigger.querySelector('[data-icon="ListView"]')).not.toBeNull();

    rerender(<ThreadFilter {...sharedProps} value={{ kind: "uncategorized" }} />);
    trigger = screen.getByRole("button", {
      name: "Projects and sections: Uncategorized",
    });
    expect(trigger.querySelector('[data-icon="ListView"]')).not.toBeNull();
  });

  it("reports project, section, uncategorized, and clear selections", () => {
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
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Waiting" }), {
      detail: 1,
    });

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: "Uncategorized" }),
      { detail: 1 },
    );

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(
      screen.getByRole("menuitemradio", {
        name: "All projects and sections",
      }),
    );

    expect(onChange).toHaveBeenNthCalledWith(1, {
      kind: "section",
      id: "section_waiting",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, { kind: "uncategorized" });
    expect(onChange).toHaveBeenNthCalledWith(3, null);
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
    expect(
      within(projectsOnlyMenu).queryByRole("menuitemradio", {
        name: "Uncategorized",
      }),
    ).toBeNull();

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

  it("keeps the creation actions visible while the filter menu is open", () => {
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

    const creationActions = document.querySelector(
      "[data-thread-filter-actions]",
    );
    expect(creationActions?.getAttribute("data-state")).toBe("closed");

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects and sections" }),
      { key: "Enter" },
    );

    expect(creationActions?.getAttribute("data-state")).toBe("open");
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

  it("opens the built-in project actions as a submenu without losing direct selection", () => {
    const onChange = vi.fn();
    render(
      <ThreadFilter
        {...actions}
        projectActionStates={
          new Map([["proj_alpha", { canAddLocalPath: true }]])
        }
        projects={projects}
        sections={sections}
        value={null}
        onChange={onChange}
        onNewProject={() => {}}
        onNewSection={() => {}}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects and sections" }),
      { key: "Enter" },
    );
    const alpha = screen.getByRole("menuitemradio", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "ArrowRight" });

    const [rootMenu, submenu] = screen.getAllByRole("menu");
    expect(rootMenu.classList.contains("z-50")).toBe(true);
    expect(submenu.classList.contains("z-50")).toBe(true);
    expect(
      within(submenu).getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Project settings", "Rename", "Add local path", "Remove"]);
    const rename = within(submenu).getByRole("menuitem", { name: "Rename" });
    fireEvent.keyDown(rename, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(rename, {
      detail: 1,
    });
    expect(actions.onRenameProject).toHaveBeenCalledWith(projects[0]);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects and sections" }),
      { key: "Enter" },
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Alpha" }), {
      detail: 1,
    });
    expect(onChange).toHaveBeenCalledWith({ kind: "project", id: "proj_alpha" });
  });

  it("opens project actions after the regular submenu hover delay", async () => {
    vi.useFakeTimers();
    try {
      render(
        <ThreadFilter
          {...actions}
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
      fireEvent.pointerMove(
        screen.getByRole("menuitemradio", { name: "Alpha" }),
        { pointerType: "mouse" },
      );
      await act(() => vi.advanceTimersByTimeAsync(110));

      expect(screen.getByRole("menuitem", { name: "Project settings" })).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves the hover tile from the item to its chevron while the submenu owns the pointer", () => {
    render(
      <ThreadFilter
        {...actions}
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
    const alpha = screen.getByRole("menuitemradio", { name: "Alpha" });
    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(false);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(true);

    fireEvent.pointerEnter(alpha, { pointerType: "mouse" });
    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(true);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(false);

    fireEvent.pointerMove(
      alpha.querySelector("[data-thread-filter-submenu-chevron]") ?? alpha,
      { pointerType: "mouse" },
    );
    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(false);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(true);

    fireEvent.pointerEnter(
      screen.getByRole("menuitem", { name: "Project settings" }),
      { pointerType: "mouse" },
    );
    fireEvent.pointerMove(
      screen.getByRole("menuitem", { name: "Project settings" }),
      { pointerType: "mouse" },
    );
    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(false);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(true);

    fireEvent.pointerMove(
      alpha.querySelector("[data-thread-filter-select-target]") ?? alpha,
      { pointerType: "mouse" },
    );
    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(true);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(false);
  });

  it("shows keyboard-focused actionable items as active", () => {
    render(
      <ThreadFilter
        {...actions}
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
    const alpha = screen.getByRole("menuitemradio", { name: "Alpha" });
    fireEvent.focus(alpha);

    expect(
      alpha
        .querySelector("[data-thread-filter-select-target]")
        ?.hasAttribute("data-active"),
    ).toBe(true);
    expect(
      alpha
        .querySelector("[data-thread-filter-submenu-chevron]")
        ?.hasAttribute("data-active"),
    ).toBe(false);
  });

  it("opens section actions on right click and does not give Threads a submenu", () => {
    render(
      <ThreadFilter
        {...actions}
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
      screen
        .getByRole("menuitemradio", { name: "Threads" })
        .querySelector('[data-icon="ChevronRight"]'),
    ).toBeNull();
    const waiting = screen.getByRole("menuitemradio", { name: "Waiting" });
    fireEvent.contextMenu(waiting);
    const submenu = screen.getAllByRole("menu")[1];
    expect(
      within(submenu).getAllByRole("menuitem").map((item) => item.textContent),
    ).toEqual(["Rename", "Remove"]);
  });
});
