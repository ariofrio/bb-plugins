import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runTaskCli } from "./cli";
import { listAllThreads } from "./list-all-threads";
import { sortExplicitPinnedThreadIds } from "./pinned-threads";
import { sidebarThreadsFromSearchResult } from "./search-results";
import { resolveStatusChord } from "./task-chords";
import { resolveTaskReorder } from "./task-reorder";
import {
  THREAD_STATUS_MIGRATIONS,
  createThreadStatusStore,
} from "./store";
import { registerTaskWorkflow } from "./task-workflow";
import { registerThreadPreviews } from "./thread-preview";
import { THREAD_STATUSES } from "./thread-status";
import {
  partitionTaskThreads,
  taskRootIdByThreadId,
  type TaskHierarchyThread,
} from "./task-ownership";

const threadStatusSchema = z.enum(THREAD_STATUSES);
const assignmentSchema = z
  .object({
    threadId: z.string(),
    taskStatus: threadStatusSchema,
    sortKey: z.string().min(1),
    updatedAt: z.number().int(),
  })
  .strict();
const destinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stay") }).strict(),
  z
    .object({
      kind: z.literal("thread"),
      threadId: z.string(),
      projectId: z.string().nullable(),
    })
    .strict(),
  z.object({ kind: z.literal("compose") }).strict(),
]);
type ChordDestination = z.infer<typeof destinationSchema>;
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
        taskThreadIds: z.array(z.string().min(1).max(256)).max(10_000),
        childThreadIds: z.array(z.string().min(1).max(256)).max(10_000),
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
    output: z.object({ destination: destinationSchema }).strict(),
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

  function requireTaskThread(
    threadId: string,
    threads: readonly TaskHierarchyThread[],
  ): void {
    const rootId = taskRootIdByThreadId(threads).get(threadId);
    if (rootId === threadId) return;
    throw new Error(
      rootId
        ? `Child thread ${threadId} has no task status; its status belongs to parent task ${rootId}.`
        : `Thread ${threadId} is not a root task thread.`,
    );
  }

  bb.rpc.register(rpcContract, {
    listState: () => store.listState(),
    listPreviews: () => ({ previews: store.listPreviews() }),
    async listPinnedThreadIds() {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
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
    syncThreads({ taskThreadIds, childThreadIds }) {
      const previousIds = store
        .listState()
        .assignments.map(({ threadId }) => threadId)
        .join("\n");
      const state = store.syncTaskThreads(taskThreadIds, childThreadIds);
      if (
        state.assignments.map(({ threadId }) => threadId).join("\n") !==
        previousIds
      ) {
        bb.realtime.publish("state-changed", { threadId: null });
      }
      return state;
    },
    async moveThread(input) {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
      requireTaskThread(input.threadId, threads);
      const state = store.reorderThread(input);
      bb.realtime.publish("state-changed", { threadId: input.threadId });
      return state;
    },
    async setTaskStatus({ threadId, taskStatus }) {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
      requireTaskThread(threadId, threads);
      const chord = resolveStatusChord({
        threadId,
        taskStatus,
        threads,
        assignments: store.listState().assignments,
        undoCandidates: store.listUndoCandidates(),
      });
      const stay: ChordDestination = { kind: "stay" };
      if (chord.kind === "none") return { destination: stay };

      if (chord.kind === "restore") {
        store.restoreToTodo(chord.threadId, chord.sortKey);
      } else {
        store.setStatus(threadId, chord.taskStatus, "app");
      }
      bb.realtime.publish("state-changed", { threadId });

      const next = chord.next;
      const destination: ChordDestination =
        next.kind === "thread"
          ? {
              kind: "thread",
              threadId: next.threadId,
              projectId:
                threads.find(({ id }) => id === next.threadId)?.projectId ??
                null,
            }
          : next;
      return { destination };
    },
    async reorderTask({ threadId, scope, direction }) {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
      requireTaskThread(threadId, threads);
      store.ensureThreads([threadId]);
      const move = resolveTaskReorder({
        threads,
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
    summary: "Treat root threads as manually organized tasks",
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
      let taskRootIds: ReadonlyMap<string, string | null> | undefined;
      if (["list", "show", "update"].includes(argv[0] ?? "")) {
        const threads = await listAllThreads(({ limit, offset }) =>
          bb.sdk.threads.list({ archived: false, limit, offset }),
        );
        const partition = partitionTaskThreads(threads);
        taskRootIds = taskRootIdByThreadId(threads);
        if (argv[0] === "list") {
          listTaskIds = partition.taskThreads.map((thread) => thread.id);
        }
        const previousIds = store
          .listState()
          .assignments.map(({ threadId }) => threadId)
          .join("\n");
        const state = store.syncTaskThreads(
          partition.taskThreads.map((thread) => thread.id),
          partition.childThreads.map((thread) => thread.id),
        );
        if (
          state.assignments.map(({ threadId }) => threadId).join("\n") !==
          previousIds
        ) {
          bb.realtime.publish("state-changed", { threadId: null });
        }
      }
      const result = runTaskCli(store, argv, {
        ...(listTaskIds ? { listTaskIds } : {}),
        ...(taskRootIds ? { taskRootIds } : {}),
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
