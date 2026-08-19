// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  PluginSidebarThread,
  PluginSidebarThreadActions,
} from "@get-bb/plugin-sdk/app";
import {
  ThreadActionsContextMenu,
  ThreadActionsDropdown,
} from "./ThreadActionsMenu";

function thread(): PluginSidebarThread {
  return {
    id: "thr_1",
    projectId: "proj_1",
    title: "Sidebar parity",
    titleFallback: null,
    parentThreadId: null,
    sectionId: null,
    originKind: null,
    originPluginId: null,
    providerId: "codex",
    hasPendingInteraction: false,
    activity: {
      workflows: 0,
      backgroundAgents: 0,
      backgroundCommands: 0,
      planMode: 0,
      goals: 0,
    },
    indicator: "none",
    indicatorLabel: null,
    isUnread: true,
    isPinned: false,
    isArchived: false,
    environment: null,
    host: null,
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: null,
    latestAttentionAt: 1,
  };
}

afterEach(cleanup);

describe("ThreadActionsDropdown", () => {
  it("mirrors the built-in thread actions and adds workflow organization", () => {
    const actions = {
      open: vi.fn(),
      openNewThread: vi.fn(),
      setPinned: vi.fn(async () => {}),
      setRead: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      archive: vi.fn(),
      requestDelete: vi.fn(),
    } satisfies PluginSidebarThreadActions;
    render(
      <ThreadActionsDropdown
        actions={actions}
        disabled={false}
        sections={[
          { id: "section_1", name: "Now" },
          { id: "section_2", name: "Later" },
        ]}
        onNewSection={vi.fn()}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={vi.fn()}
        onSetWorkflowStage={vi.fn()}
        splitAvailable
        workflowStage="To do"
        thread={thread()}
      />,
    );

    const trigger = screen.getByLabelText("Thread actions");
    expect(trigger.className).toContain("cursor-pointer");
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByText("Open in split")).toBeDefined();
    expect(screen.getByText("Mark read")).toBeDefined();
    expect(screen.getByText("Pin")).toBeDefined();
    expect(screen.getByText("Rename")).toBeDefined();
    expect(screen.getByText("Set section")).toBeDefined();
    expect(screen.getByText("Set stage")).toBeDefined();
    expect(screen.queryByText("Set workflow stage")).toBeNull();
    expect(screen.queryByText("Move up")).toBeNull();
    expect(screen.queryByText("Move down")).toBeNull();
    expect(screen.getByText("Archive")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  }, 10_000);

  it("does not offer workflow stage controls for a child thread", () => {
    const actions = {
      open: vi.fn(),
      openNewThread: vi.fn(),
      setPinned: vi.fn(async () => {}),
      setRead: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      archive: vi.fn(),
      requestDelete: vi.fn(),
    } satisfies PluginSidebarThreadActions;
    render(
      <ThreadActionsDropdown
        actions={actions}
        disabled={false}
        sections={[]}
        onNewSection={vi.fn()}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={vi.fn()}
        onSetWorkflowStage={vi.fn()}
        splitAvailable={false}
        workflowStage={null}
        thread={{ ...thread(), parentThreadId: "thr_parent" }}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    expect(screen.queryByText("Set stage")).toBeNull();
    expect(screen.getByText("Set section")).toBeDefined();
  });

  it("sets, clears, and creates sections from its submenu", () => {
    const onNewSection = vi.fn();
    const onSetSection = vi.fn();
    const actions = {
      open: vi.fn(),
      openNewThread: vi.fn(),
      setPinned: vi.fn(async () => {}),
      setRead: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      archive: vi.fn(),
      requestDelete: vi.fn(),
    } satisfies PluginSidebarThreadActions;
    const view = render(
      <ThreadActionsDropdown
        actions={actions}
        disabled={false}
        sections={[
          { id: "section_1", name: "Now" },
          { id: "section_2", name: "Later" },
        ]}
        onNewSection={onNewSection}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={onSetSection}
        onSetWorkflowStage={vi.fn()}
        splitAvailable={false}
        workflowStage="To do"
        thread={{ ...thread(), sectionId: "section_1" }}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    fireEvent.click(screen.getByText("Set section"));
    expect(screen.getByText("No section")).toBeDefined();
    expect(screen.getByText("Now")).toBeDefined();
    expect(screen.getByText("Later")).toBeDefined();
    expect(screen.getByText("New section")).toBeDefined();
    fireEvent.click(screen.getByText("Later"));
    expect(onSetSection).toHaveBeenCalledWith("section_2");

    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    fireEvent.click(screen.getByText("Set section"));
    fireEvent.click(screen.getByText("No section"));
    expect(onSetSection).toHaveBeenCalledWith(null);

    view.rerender(
      <ThreadActionsDropdown
        actions={actions}
        disabled={false}
        sections={[
          { id: "section_1", name: "Now" },
          { id: "section_2", name: "Later" },
        ]}
        onNewSection={onNewSection}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={onSetSection}
        onSetWorkflowStage={vi.fn()}
        splitAvailable={false}
        workflowStage="To do"
        thread={thread()}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    fireEvent.click(screen.getByText("Set section"));
    fireEvent.click(screen.getByText("No section"));
    expect(onSetSection).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    fireEvent.click(screen.getByText("Set section"));
    fireEvent.click(screen.getByText("New section"));
    expect(onNewSection).toHaveBeenCalledOnce();
  });
});

describe("ThreadActionsContextMenu", () => {
  it("portals the workflow stage submenu outside the parent menu", () => {
    const actions = {
      open: vi.fn(),
      openNewThread: vi.fn(),
      setPinned: vi.fn(async () => {}),
      setRead: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      archive: vi.fn(),
      requestDelete: vi.fn(),
    } satisfies PluginSidebarThreadActions;
    render(
      <ThreadActionsContextMenu
        actions={actions}
        disabled={false}
        sections={[]}
        onNewSection={vi.fn()}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={vi.fn()}
        onSetWorkflowStage={vi.fn()}
        splitAvailable
        workflowStage="To do"
        thread={thread()}
      >
        <button type="button">Thread row</button>
      </ThreadActionsContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Thread row" }));
    const parentMenu = screen.getByRole("menu", { name: "Thread actions" });
    fireEvent.click(screen.getByText("Set stage"));

    expect(parentMenu.contains(screen.getByText("Done"))).toBe(false);
  });

  it("portals the section submenu outside the right-click menu", () => {
    const actions = {
      open: vi.fn(),
      openNewThread: vi.fn(),
      setPinned: vi.fn(async () => {}),
      setRead: vi.fn(async () => {}),
      rename: vi.fn(async () => {}),
      archive: vi.fn(),
      requestDelete: vi.fn(),
    } satisfies PluginSidebarThreadActions;
    render(
      <ThreadActionsContextMenu
        actions={actions}
        disabled={false}
        sections={[{ id: "section_1", name: "Later" }]}
        onNewSection={vi.fn()}
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetSection={vi.fn()}
        onSetWorkflowStage={vi.fn()}
        splitAvailable
        workflowStage="To do"
        thread={thread()}
      >
        <button type="button">Thread row</button>
      </ThreadActionsContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Thread row" }));
    const parentMenu = screen.getByRole("menu", { name: "Thread actions" });
    fireEvent.click(screen.getByText("Set section"));

    expect(screen.getByText("Later")).toBeDefined();
    expect(screen.getByText("New section")).toBeDefined();
    expect(parentMenu.contains(screen.getByText("New section"))).toBe(false);
  });
});
