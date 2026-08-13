// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskStatusIcon } from "./TaskStatusIcon";

afterEach(cleanup);

describe("TaskStatusIcon", () => {
  it.each([
    ["Done", "CheckmarkSquare"],
    ["To do", "Square"],
    ["Working", "Diamond"],
    ["Blocked", "ClockSquare"],
    ["Backlog", "DashedSquare"],
    ["Canceled", "CancelSquare"],
  ] as const)("renders the requested icon for %s", (status, iconName) => {
    const { container } = render(<TaskStatusIcon status={status} />);

    expect(container.querySelector("svg")?.getAttribute("data-icon")).toBe(
      iconName,
    );
  });
});
