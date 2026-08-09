import { THREAD_STATUSES, parseThreadStatus } from "./thread-status";
import type { ThreadStatusStore } from "./store";

interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}
const REORDER_USAGE =
  "Usage: bb thread-status reorder <thread-id> [--after <id>] [--before <id>] [--json]\n";
const HELP = `Manage manual thread statuses and order.

Usage:
  bb thread-status get <thread-id> [--json]
  bb thread-status set <thread-id> <status> [--json]
  bb thread-status list [--status <status>] [--json]
  bb thread-status reorder <thread-id> [--after <id>] [--before <id>] [--json]

Statuses: ${THREAD_STATUSES.join(", ")}
`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function humanStatus(value: ReturnType<ThreadStatusStore["get"]>): string {
  return `${value.threadId}\t${value.status}${value.explicit ? "" : " (default)"}\n`;
}

export function runThreadStatusCli(
  store: ThreadStatusStore,
  argv: readonly string[],
): CliResult {
  const wantsJson = argv.includes("--json");
  const args = argv.filter((arg) => arg !== "--json");
  const command = args[0];

  try {
    if (!command || command === "help" || command === "--help" || command === "-h") {
      return { exitCode: 0, stdout: HELP };
    }

    if (command === "get") {
      const threadId = args[1];
      if (!threadId || args.length !== 2) {
        return { exitCode: 2, stderr: "Usage: bb thread-status get <thread-id> [--json]\n" };
      }
      const result = store.get(threadId);
      return { exitCode: 0, stdout: wantsJson ? json(result) : humanStatus(result) };
    }

    if (command === "set") {
      const threadId = args[1];
      const rawStatus = args.slice(2).join(" ");
      const status = parseThreadStatus(rawStatus);
      if (!threadId || !status) {
        return {
          exitCode: 2,
          stderr: `Usage: bb thread-status set <thread-id> <status> [--json]\nStatuses: ${THREAD_STATUSES.join(", ")}\n`,
        };
      }
      store.setStatus(threadId, status);
      const result = store.get(threadId);
      return { exitCode: 0, stdout: wantsJson ? json(result) : humanStatus(result) };
    }

    if (command === "list") {
      const statusFlag = args.indexOf("--status");
      let status = null;
      if (statusFlag >= 0) {
        status = parseThreadStatus(args.slice(statusFlag + 1).join(" "));
        if (!status) {
          return {
            exitCode: 2,
            stderr: `Unknown status. Expected one of: ${THREAD_STATUSES.join(", ")}\n`,
          };
        }
      } else if (args.length !== 1) {
        return { exitCode: 2, stderr: "Usage: bb thread-status list [--status <status>] [--json]\n" };
      }
      const state = store.listState();
      const assignments = status
        ? state.assignments.filter((assignment) => assignment.status === status)
        : state.assignments;
      if (wantsJson) {
        return { exitCode: 0, stdout: json({ assignments }) };
      }
      return {
        exitCode: 0,
        stdout:
          assignments.length === 0
            ? "No explicit thread statuses. Unassigned threads default to To Do.\n"
            : assignments
                .map((assignment) => `${assignment.threadId}\t${assignment.status}\t${assignment.sortKey}`)
                .join("\n") + "\n",
      };
    }

    if (command === "reorder") {
      if (args[1] === "--help" || args[1] === "-h") {
        return { exitCode: 0, stdout: REORDER_USAGE };
      }
      const threadId = args[1];
      if (!threadId) return { exitCode: 2, stderr: REORDER_USAGE };

      let previousThreadId: string | null = null;
      let nextThreadId: string | null = null;
      const seen = new Set<string>();
      for (let index = 2; index < args.length; index += 2) {
        const flag = args[index];
        const value = args[index + 1];
        if (
          (flag !== "--after" && flag !== "--before") ||
          !value ||
          value.startsWith("--") ||
          seen.has(flag)
        ) {
          return { exitCode: 2, stderr: REORDER_USAGE };
        }
        seen.add(flag);
        if (flag === "--after") previousThreadId = value;
        else nextThreadId = value;
      }

      const current = store.get(threadId);
      if (!current.explicit) {
        throw new Error(`Thread ${threadId} has no explicit status. Set it first.`);
      }
      const state = store.reorderThread({
        threadId,
        status: current.status,
        previousThreadId,
        nextThreadId,
      });
      return {
        exitCode: 0,
        stdout: wantsJson ? json(state) : `Thread ${threadId} reordered\n`,
      };
    }

    return { exitCode: 2, stderr: `Unknown command: ${command}\n\n${HELP}` };
  } catch (error) {
    return {
      exitCode: 1,
      stderr: `${error instanceof Error ? error.message : String(error)}\n`,
    };
  }
}
