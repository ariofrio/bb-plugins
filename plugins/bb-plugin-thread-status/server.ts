import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runThreadStatusCli } from "./cli";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import { THREAD_STATUSES } from "./thread-status";

const threadStatusSchema = z.enum(THREAD_STATUSES);
const assignmentSchema = z
  .object({
    threadId: z.string(),
    status: threadStatusSchema,
    sortKey: z.string().min(1),
    updatedAt: z.number().int(),
  })
  .strict();
const stateSchema = z
  .object({
    assignments: z.array(assignmentSchema),
  })
  .strict();

export const rpcContract = defineRpcContract({
  listState: {
    input: z.null(),
    output: stateSchema,
  },
  syncThreads: {
    input: z
      .object({
        threadIds: z.array(z.string().min(1).max(256)).max(10_000),
      })
      .strict(),
    output: stateSchema,
  },
  moveThread: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        status: threadStatusSchema,
        previousThreadId: z.string().min(1).max(256).nullable(),
        nextThreadId: z.string().min(1).max(256).nullable(),
      })
      .strict(),
    output: stateSchema,
  },
});

export default function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, THREAD_STATUS_MIGRATIONS);
  const store = createThreadStatusStore(db);

  bb.rpc.register(rpcContract, {
    listState: () => store.listState(),
    syncThreads({ threadIds }) {
      const previousCount = store.listState().assignments.length;
      const state = store.ensureThreads(threadIds);
      if (state.assignments.length !== previousCount) {
        bb.realtime.publish("state-changed", { threadId: null });
      }
      return state;
    },
    moveThread(input) {
      const state = store.reorderThread(input);
      bb.realtime.publish("state-changed", { threadId: input.threadId });
      return state;
    },
  });

  bb.cli.register({
    name: "thread-status",
    summary: "Manage manual thread workflow status and order",
    commands: [
      {
        name: "get",
        summary: "Get a thread's manual status",
        usage: "bb thread-status get <thread-id> [--json]",
      },
      {
        name: "set",
        summary: "Set a thread's manual status",
        usage: "bb thread-status set <thread-id> <status> [--json]",
      },
      {
        name: "list",
        summary: "List explicitly organized threads",
        usage: "bb thread-status list [--status <status>] [--json]",
      },
      {
        name: "reorder",
        summary: "Move a thread between adjacent threads in its status",
        usage:
          "bb thread-status reorder <thread-id> [--after <id>] [--before <id>] [--json]",
      },
    ],
    run(argv) {
      const result = runThreadStatusCli(store, argv);
      if ((argv[0] === "set" || argv[0] === "reorder") && result.exitCode === 0) {
        bb.realtime.publish("state-changed", { threadId: argv[1] ?? null });
      }
      return result;
    },
  });

  bb.events.on("thread.deleted", ({ thread }) => {
    if (store.delete(thread.id)) {
      bb.realtime.publish("state-changed", { threadId: thread.id });
    }
  });

  bb.log.info("Thread Status loaded");
}
