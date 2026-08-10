import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runTaskCli } from "./cli";
import { sortExplicitPinnedThreadIds } from "./pinned-threads";
import { sidebarThreadsFromSearchResult } from "./search-results";
import { resolveTaskReorder } from "./task-reorder";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import { registerTaskWorkflow } from "./task-workflow";
import { registerThreadPreviews } from "./thread-preview";
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
const previewsSchema = z
  .object({
    previews: z.array(
      z
        .object({
          threadId: z.string(),
          preview: z.string().max(500).nullable(),
        })
        .strict(),
    ),
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
  listPreviews: {
    input: z.null(),
    output: previewsSchema,
  },
  listPinnedThreadIds: {
    input: z.null(),
    output: z.object({ threadIds: z.array(z.string()) }).strict(),
  },
  reorderPinnedThread: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        previousThreadId: z.string().min(1).max(256).nullable(),
        nextThreadId: z.string().min(1).max(256).nullable(),
      })
      .strict(),
    output: z.object({ threadIds: z.array(z.string()) }).strict(),
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
  setTaskStatus: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        taskStatus: threadStatusSchema,
      })
      .strict(),
    output: stateSchema,
  },
  reorderTask: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        scope: z.enum(["step", "edge", "status"]),
        direction: z.union([z.literal(-1), z.literal(1)]),
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
    listPreviews: () => ({ previews: store.listPreviews() }),
    async listPinnedThreadIds() {
      const threads = await bb.sdk.threads.list({ archived: false });
      return { threadIds: sortExplicitPinnedThreadIds(threads) };
    },
    async reorderPinnedThread(input) {
      const threads = await bb.sdk.threads.reorderPinned(input);
      return { threadIds: sortExplicitPinnedThreadIds(threads) };
    },
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
    setTaskStatus({ threadId, taskStatus }) {
      const state = store.setStatus(threadId, taskStatus);
      bb.realtime.publish("state-changed", { threadId });
      return state;
    },
    async reorderTask({ threadId, scope, direction }) {
      store.ensureThreads([threadId]);
      const move = resolveTaskReorder({
        threads: await bb.sdk.threads.list({ archived: false }),
        assignments: store.listState().assignments,
        threadId,
        taskStatus: store.get(threadId).taskStatus,
        intent: { scope, direction },
      });
      if (move.kind === "none") return store.listState();
      if (move.kind === "pinned") {
        await bb.sdk.threads.reorderPinned({
          threadId,
          previousThreadId: move.previousThreadId,
          nextThreadId: move.nextThreadId,
        });
        bb.realtime.publish("state-changed", { threadId });
        return store.listState();
      }
      const state =
        move.kind === "status"
          ? store.setStatus(threadId, move.taskStatus)
          : store.reorderThread({
              threadId,
              taskStatus: move.taskStatus,
              previousThreadId: move.previousThreadId,
              nextThreadId: move.nextThreadId,
            });
      bb.realtime.publish("state-changed", { threadId });
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

  registerTaskWorkflow(bb, store);
  registerThreadPreviews(bb, store);

  bb.log.info("Thread tasks loaded");
}
