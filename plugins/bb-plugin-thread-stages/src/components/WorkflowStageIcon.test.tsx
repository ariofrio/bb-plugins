// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BanIcon,
  CheckmarkCircle02Icon,
  CircleDashedIcon,
  CircleIcon,
  CircleXIcon,
  Progress02Icon,
} from "@hugeicons/core-free-icons";
import { afterEach, describe, expect, it } from "vitest";
import { WorkflowStageIcon } from "./WorkflowStageIcon";

afterEach(cleanup);

describe("WorkflowStageIcon", () => {
  it.each([
    ["Backlog", "CircleDashed", CircleDashedIcon],
    ["To do", "Circle", CircleIcon],
    ["Working", "Progress02", Progress02Icon],
    ["Blocked", "Ban", BanIcon],
    ["Done", "CheckmarkCircle", CheckmarkCircle02Icon],
    ["Canceled", "CircleX", CircleXIcon],
  ] as const)("renders the requested icon for %s", (stage, iconName, icon) => {
    const { container } = render(<WorkflowStageIcon stage={stage} />);
    const { container: expectedContainer } = render(
      <HugeiconsIcon icon={icon} size={16} />,
    );

    expect(container.querySelector("svg")?.getAttribute("data-icon")).toBe(
      iconName,
    );
    expect(container.querySelector("svg")?.innerHTML).toBe(
      expectedContainer.querySelector("svg")?.innerHTML,
    );
  });
});
