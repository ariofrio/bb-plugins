import { describe, expect, it } from "vitest";
import {
  selectReusableTerminalId,
  type TerminalCandidate,
} from "./terminal-selection";

function terminal(
  id: string,
  overrides: Partial<TerminalCandidate> = {},
): TerminalCandidate {
  return {
    createdAt: 1,
    id,
    lastUserInputAt: null,
    status: "running",
    updatedAt: 1,
    ...overrides,
  };
}

describe("selectReusableTerminalId", () => {
  it("prefers the client-selected terminal", () => {
    expect(
      selectReusableTerminalId(
        [terminal("term_one"), terminal("term_two")],
        "term_one",
      ),
    ).toBe("term_one");
  });

  it("allows the currently retained disconnected terminal", () => {
    expect(
      selectReusableTerminalId(
        [terminal("term_one", { status: "disconnected" })],
        "term_one",
      ),
    ).toBe("term_one");
  });

  it("falls back to the terminal with the most recent user input", () => {
    expect(
      selectReusableTerminalId(
        [
          terminal("term_old", { lastUserInputAt: 10, updatedAt: 100 }),
          terminal("term_recent", { lastUserInputAt: 20, updatedAt: 50 }),
        ],
        null,
      ),
    ).toBe("term_recent");
  });

  it("uses update and creation time when neither terminal has input", () => {
    expect(
      selectReusableTerminalId(
        [
          terminal("term_old", { updatedAt: 10, createdAt: 10 }),
          terminal("term_recent", { updatedAt: 20, createdAt: 5 }),
        ],
        null,
      ),
    ).toBe("term_recent");
  });

  it("does not reuse exited or unretained disconnected terminals", () => {
    expect(
      selectReusableTerminalId(
        [
          terminal("term_exited", { status: "exited" }),
          terminal("term_disconnected", { status: "disconnected" }),
        ],
        null,
      ),
    ).toBeNull();
  });
});
