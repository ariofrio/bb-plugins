import { THREAD_STATUSES, parseThreadStatus } from "./thread-status";
import type { ThreadStatusStore } from "./store";

interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface TaskCliContext {
  listTaskIds?: readonly string[];
  threadId?: string;
}

interface ParsedArguments {
  options: Map<string, string | true>;
  positionals: string[];
}

const STATUS_LABELS = THREAD_STATUSES.join(", ");
const USAGE = {
  list: "Usage: bb task list [--status <status>] [--json]\n",
  show: "Usage: bb task show [id] [--self] [--json]\n",
  update:
    "Usage: bb task update [id] [--self] [--status <status>] [--after <id>] [--before <id>] [--json]\n",
} as const;

const HELP = `Usage: bb task [options] [command]

Treat threads as manually organized tasks

Options:
  -h, --help                         display help for command

Commands:
  list [options]                     List tasks
  show [options] [id]                Show task details
  update [options] [id]              Update a task
  help [command]                     display help for command
`;

const COMMAND_HELP: Record<keyof typeof USAGE, string> = {
  list: `${USAGE.list}\nList tasks\n\nOptions:\n  --status <status>  Filter by task status\n  --json             Print machine-readable JSON output\n  -h, --help         display help for command\n`,
  show: `${USAGE.show}\nShow task details\n\nOptions:\n  --self      Target the current thread\n  --json      Print machine-readable JSON output\n  -h, --help  display help for command\n`,
  update: `${USAGE.update}\nUpdate a task's status or position\n\nOptions:\n  --self             Target the current thread\n  --status <status>  Set the task status: ${STATUS_LABELS}\n  --after <id>       Previous task, or omit for the start\n  --before <id>      Next task, or omit for the end\n  --json             Print machine-readable JSON output\n  -h, --help         display help for command\n`,
};

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function taskAssignmentJson(
  assignment: ReturnType<ThreadStatusStore["listState"]>["assignments"][number],
) {
  const { threadId, ...task } = assignment;
  return { id: threadId, ...task };
}

function taskLookupJson(value: ReturnType<ThreadStatusStore["get"]>) {
  const { threadId, ...task } = value;
  return { id: threadId, ...task };
}

function parseArguments(
  args: readonly string[],
  valueOptions: readonly string[],
  booleanOptions: readonly string[] = [],
): ParsedArguments {
  const options = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    if (options.has(arg)) throw new Error(`Option ${arg} cannot be repeated.`);
    if (booleanOptions.includes(arg)) {
      options.set(arg, true);
      continue;
    }
    if (!valueOptions.includes(arg)) throw new Error(`Unknown option: ${arg}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Option ${arg} requires a value.`);
    }
    options.set(arg, value);
    index += 1;
  }
  return { options, positionals };
}

function resolveTaskId(
  positionalId: string | undefined,
  self: boolean,
  context: TaskCliContext,
): string {
  if (self && positionalId) {
    throw new Error("Cannot combine a task ID argument with --self.");
  }
  if (self) {
    if (!context.threadId) throw new Error("--self requires a current bb thread.");
    return context.threadId;
  }
  if (positionalId) return positionalId;
  throw new Error("Missing task ID. Pass <id> or use --self.");
}

function humanTask(value: ReturnType<ThreadStatusStore["get"]>): string {
  return `Task: ${value.threadId}\n  Status: ${value.status}${
    value.explicit ? "" : " (default)"
  }\n  Order: ${value.sortKey ?? "-"}\n`;
}

function humanTaskList(
  assignments: ReturnType<ThreadStatusStore["listState"]>["assignments"],
): string {
  if (assignments.length === 0) return "No tasks found\n";
  const rows = [
    ["ID", "Status", "Order"],
    ...assignments.map((assignment) => [
      assignment.threadId,
      assignment.status,
      assignment.sortKey,
    ]),
  ];
  const widths = [0, 1, 2].map((column) =>
    Math.max(...rows.map((row) => row[column]?.length ?? 0)),
  );
  return `\n${rows
    .map((row) =>
      row
        .map((value, column) => value.padEnd(widths[column] ?? value.length))
        .join("  ")
        .trimEnd(),
    )
    .join("\n")}\n\n`;
}

function commandHelp(command: string | undefined): string | null {
  if (!command) return HELP;
  if (command in COMMAND_HELP) {
    return COMMAND_HELP[command as keyof typeof COMMAND_HELP];
  }
  return null;
}

export function runTaskCli(
  store: ThreadStatusStore,
  argv: readonly string[],
  context: TaskCliContext = {},
): CliResult {
  const wantsJson = argv.includes("--json");
  const args = argv.filter((arg) => arg !== "--json");
  const command = args[0];

  try {
    if (!command || command === "--help" || command === "-h") {
      return { exitCode: 0, stdout: HELP };
    }
    if (command === "help") {
      const help = commandHelp(args[1]);
      return help
        ? { exitCode: 0, stdout: help }
        : { exitCode: 2, stderr: `Unknown command: ${args[1]}\n\n${HELP}` };
    }
    if (args[1] === "--help" || args[1] === "-h") {
      const help = commandHelp(command);
      return help
        ? { exitCode: 0, stdout: help }
        : { exitCode: 2, stderr: `Unknown command: ${command}\n\n${HELP}` };
    }

    if (command === "list") {
      const { options, positionals } = parseArguments(args.slice(1), ["--status"]);
      if (positionals.length > 0) return { exitCode: 2, stderr: USAGE.list };
      const rawStatus = options.get("--status");
      const status =
        typeof rawStatus === "string" ? parseThreadStatus(rawStatus) : null;
      if (rawStatus && !status) {
        throw new Error(`Unknown status. Expected one of: ${STATUS_LABELS}`);
      }
      const listedTaskIds = context.listTaskIds
        ? new Set(context.listTaskIds)
        : null;
      const assignments = store.listState().assignments.filter(
        (assignment) =>
          (!listedTaskIds || listedTaskIds.has(assignment.threadId)) &&
          (!status || assignment.status === status),
      );
      return {
        exitCode: 0,
        stdout: wantsJson
          ? json(assignments.map(taskAssignmentJson))
          : humanTaskList(assignments),
      };
    }

    if (command === "show") {
      const { options, positionals } = parseArguments(args.slice(1), [], ["--self"]);
      if (positionals.length > 1) return { exitCode: 2, stderr: USAGE.show };
      const taskId = resolveTaskId(
        positionals[0],
        options.get("--self") === true,
        context,
      );
      const task = store.get(taskId);
      return {
        exitCode: 0,
        stdout: wantsJson ? json(taskLookupJson(task)) : humanTask(task),
      };
    }

    if (command === "update") {
      const { options, positionals } = parseArguments(
        args.slice(1),
        ["--status", "--after", "--before"],
        ["--self"],
      );
      if (positionals.length > 1) return { exitCode: 2, stderr: USAGE.update };
      const rawStatus = options.get("--status");
      const rawAfter = options.get("--after");
      const rawBefore = options.get("--before");
      if (
        typeof rawStatus !== "string" &&
        typeof rawAfter !== "string" &&
        typeof rawBefore !== "string"
      ) {
        throw new Error(
          "No changes requested. Provide --status, --after, or --before.",
        );
      }
      const taskId = resolveTaskId(
        positionals[0],
        options.get("--self") === true,
        context,
      );
      const current = store.get(taskId);
      const status =
        typeof rawStatus === "string"
          ? parseThreadStatus(rawStatus)
          : current.status;
      if (!status) throw new Error(`Unknown status. Expected one of: ${STATUS_LABELS}`);

      const warnings: string[] = [];
      function validNeighbor(
        flag: "--after" | "--before",
        value: string | true | undefined,
      ): string | null {
        if (typeof value !== "string") return null;
        const neighbor = store.get(value);
        if (!neighbor.explicit || neighbor.status !== status) {
          warnings.push(
            `Warning: ${flag} task ${value} is not in status ${status}; ignoring ${flag}.`,
          );
          return null;
        }
        return value;
      }

      const previousThreadId = validNeighbor("--after", rawAfter);
      const nextThreadId = validNeighbor("--before", rawBefore);
      const hasValidPosition =
        previousThreadId !== null || nextThreadId !== null;
      if (hasValidPosition) {
        store.reorderThread({
          threadId: taskId,
          status,
          previousThreadId,
          nextThreadId,
        });
      } else if (current.status !== status || typeof rawStatus === "string") {
        store.setStatus(taskId, status);
      }
      const task = store.get(taskId);
      return {
        exitCode: 0,
        stdout: wantsJson
          ? json(taskLookupJson(task))
          : `Task ${taskId} updated\n${humanTask(task)}`,
        ...(warnings.length > 0 ? { stderr: `${warnings.join("\n")}\n` } : {}),
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
