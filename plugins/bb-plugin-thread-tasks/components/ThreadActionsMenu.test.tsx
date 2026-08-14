// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type {
  PluginSidebarThread,
  PluginSidebarThreadActions,
} from "@bb/plugin-sdk/app";
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
  it("mirrors the built-in thread actions and adds task organization", () => {
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
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetTaskStatus={vi.fn()}
        splitAvailable
        taskStatus="To do"
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
    expect(screen.getByText("Set task status")).toBeDefined();
    expect(screen.queryByText("Move up")).toBeNull();
    expect(screen.queryByText("Move down")).toBeNull();
    expect(screen.getByText("Archive")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  }, 10_000);

  it("does not offer task status controls for a child thread", () => {
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
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetTaskStatus={vi.fn()}
        splitAvailable={false}
        taskStatus={null}
        thread={{ ...thread(), parentThreadId: "thr_parent" }}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Thread actions"), { key: "Enter" });
    expect(screen.queryByText("Set task status")).toBeNull();
  });
});

describe("ThreadActionsContextMenu", () => {
  it("portals the task status submenu outside the parent menu", () => {
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
        onOpenChange={vi.fn()}
        onRename={vi.fn()}
        onSetTaskStatus={vi.fn()}
        splitAvailable
        taskStatus="To do"
        thread={thread()}
      >
        <button type="button">Thread row</button>
      </ThreadActionsContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Thread row" }));
    const parentMenu = screen.getByRole("menu", { name: "Thread actions" });
    fireEvent.click(screen.getByText("Set task status"));

    expect(parentMenu.contains(screen.getByText("Done"))).toBe(false);
  });
});
