// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkflowStageIcon } from "./WorkflowStageIcon";

afterEach(cleanup);

describe("WorkflowStageIcon", () => {
  it.each([
    ["Done", "CheckmarkSquare"],
    ["To do", "Square"],
    ["Working", "Diamond"],
    ["Blocked", "ClockSquare"],
    ["Backlog", "DashedSquare"],
    ["Canceled", "CancelSquare"],
  ] as const)("renders the requested icon for %s", (stage, iconName) => {
    const { container } = render(<WorkflowStageIcon stage={stage} />);

    expect(container.querySelector("svg")?.getAttribute("data-icon")).toBe(
      iconName,
    );
  });
});
