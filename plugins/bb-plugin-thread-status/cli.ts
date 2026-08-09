import { THREAD_STATUSES, parseThreadStatus } from "./thread-status";
import type { ThreadStatusStore } from "./store";

interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}
const HELP = `Manage manual thread statuses and order.

Usage:
  bb thread-status get <thread-id> [--json]
  bb thread-status set <thread-id> <status> [--json]
  bb thread-status list [--status <status>] [--json]

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
        return { exitCode: 0, stdout: json({ revision: state.revision, assignments }) };
      }
      return {
        exitCode: 0,
        stdout:
          assignments.length === 0
            ? "No explicit thread statuses. Unassigned threads default to To Do.\n"
            : assignments
                .map((assignment) => `${assignment.threadId}\t${assignment.status}\t${assignment.position}`)
                .join("\n") + "\n",
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
