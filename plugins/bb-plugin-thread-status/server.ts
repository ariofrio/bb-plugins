import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runTaskCli } from "./cli";
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
    name: "task",
    summary: "Treat threads as manually organized tasks",
    commands: [
      {
        name: "list",
        summary: "List tasks",
        usage: "bb task list [--status <status>] [--json]",
      },
      {
        name: "show",
        summary: "Show task details",
        usage: "bb task show [id] [--self] [--json]",
      },
      {
        name: "update",
        summary: "Update a task",
        usage: "bb task update [id] [--self] --status <status> [--json]",
      },
      {
        name: "reorder",
        summary: "Move a task between adjacent tasks in its status",
        usage:
          "bb task reorder <id> [--after <id>] [--before <id>] [--json]",
      },
    ],
    async run(argv, context) {
      let listTaskIds: string[] | undefined;
      if (argv[0] === "list") {
        const previousCount = store.listState().assignments.length;
        const threads = await bb.sdk.threads.list();
        listTaskIds = threads.map((thread) => thread.id);
        const state = store.ensureThreads(listTaskIds);
        if (state.assignments.length !== previousCount) {
          bb.realtime.publish("state-changed", { threadId: null });
        }
      }
      const result = runTaskCli(store, argv, {
        ...(listTaskIds ? { listTaskIds } : {}),
        ...(context.threadId ? { threadId: context.threadId } : {}),
      });
      if ((argv[0] === "update" || argv[0] === "reorder") && result.exitCode === 0) {
        bb.realtime.publish("state-changed", { threadId: null });
      }
      return result;
    },
  });

  bb.events.on("thread.deleted", ({ thread }) => {
    if (store.delete(thread.id)) {
      bb.realtime.publish("state-changed", { threadId: thread.id });
    }
  });

  bb.log.info("Thread Tasks loaded");
}
