import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runTaskCli } from "./cli";
import { sidebarThreadsFromSearchResult } from "./search-results";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import { THREAD_STATUSES } from "./thread-status";

const threadStatusSchema = z.enum(THREAD_STATUSES);
const assignmentSchema = z
  .object({
    threadId: z.string(),
    taskStatus: threadStatusSchema,
    sortKey: z.string().min(1),
    updatedAt: z.number().int(),
  })
  .strict();
const stateSchema = z
  .object({
    assignments: z.array(assignmentSchema),
  })
  .strict();
const searchResultSchema = z
  .object({
    threads: z.array(
      z
        .object({
          id: z.string(),
          projectId: z.string(),
          title: z.string().nullable(),
          titleFallback: z.string().nullable(),
          parentThreadId: z.string().nullable(),
          providerId: z.string(),
          isArchived: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();

export const rpcContract = defineRpcContract({
  listState: {
    input: z.null(),
    output: stateSchema,
  },
  searchThreads: {
    input: z
      .object({
        query: z.string().trim().min(1).max(500),
      })
      .strict(),
    output: searchResultSchema,
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
        taskStatus: threadStatusSchema,
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
    async searchThreads({ query }) {
      const result = await bb.sdk.threads.search({
        query,
        limitPerGroup: "50",
      });
      return {
        threads: sidebarThreadsFromSearchResult(result),
      };
    },
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
        summary: "Update task status or position",
        usage:
          "bb task update [id] [--self] [--status <status>] [--after <id>] [--before <id>] [--json]",
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
      if (argv[0] === "update" && result.exitCode === 0) {
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
