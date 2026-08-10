// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskStatusIcon } from "./TaskStatusIcon";

afterEach(cleanup);

describe("TaskStatusIcon", () => {
  it.each([
    ["Done", "CheckmarkCircle"],
    ["To Do", "Circle"],
    ["Working", "Loading"],
    ["Waiting", "Clock"],
    ["Deferred", "DashedCircle"],
    ["Canceled", "CancelCircle"],
  ] as const)("renders the requested icon for %s", (status, iconName) => {
    const { container } = render(<TaskStatusIcon status={status} />);

    expect(container.querySelector("svg")?.getAttribute("data-icon")).toBe(
      iconName,
    );
  });
});
