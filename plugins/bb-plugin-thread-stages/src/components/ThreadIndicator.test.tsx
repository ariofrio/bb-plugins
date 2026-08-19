// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PluginSidebarThread } from "@get-bb/plugin-sdk/app";
import { groupIndicator, ThreadIndicator } from "./ThreadIndicator";

function thread(
  indicator: PluginSidebarThread["indicator"],
): PluginSidebarThread {
  return {
    id: `thr_${indicator}`,
    projectId: "proj_1",
    title: indicator,
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
    indicator,
    indicatorLabel: `${indicator} label`,
    isUnread: false,
    isPinned: false,
    isArchived: false,
    environment: null,
    host: null,
    createdAt: 1,
    updatedAt: 1,
    lastReadAt: 1,
    latestAttentionAt: 1,
  };
}

afterEach(cleanup);

describe("ThreadIndicator", () => {
  it("uses the host-provided accessible label", () => {
    render(<ThreadIndicator indicator="waiting-for-input" label="Needs input" />);
    expect(screen.getByLabelText("Needs input")).toBeDefined();
  });

  it("renders no glyph for an idle thread", () => {
    const rendered = render(<ThreadIndicator indicator="none" label={null} />);
    expect(rendered.container.innerHTML).toBe("");
  });

  it("uses the plugin progress icon for plan mode", () => {
    const rendered = render(
      <ThreadIndicator indicator="plan-mode" label="Planning" />,
    );

    expect(
      rendered.container.querySelector("svg")?.getAttribute("data-icon"),
    ).toBe("Progress02");
  });
});

describe("groupIndicator", () => {
  it("rolls up attention ahead of background activity", () => {
    const waiting = thread("waiting-for-input");
    expect(groupIndicator([thread("runtime"), waiting, thread("none")])).toBe(
      waiting,
    );
  });
});
