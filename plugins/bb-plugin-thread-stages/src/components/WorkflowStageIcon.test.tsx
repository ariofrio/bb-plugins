// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CircleDashedIcon,
  Progress01Icon,
  Progress02Icon,
} from "@hugeicons/core-free-icons";
import { afterEach, describe, expect, it } from "vitest";
import { WorkflowStageIcon } from "./WorkflowStageIcon";
import { BlockedProgressIcon, CompletedProgressIcon } from "./composed-icons";

afterEach(cleanup);

describe("WorkflowStageIcon", () => {
  it.each([
    ["Deferred", "CircleDashed", CircleDashedIcon],
    ["Idle", "Progress01", Progress01Icon],
    ["Active", "Progress02", Progress02Icon],
    ["Blocked", "BlockedProgress", BlockedProgressIcon],
    ["Completed", "CompletedProgress", CompletedProgressIcon],
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
