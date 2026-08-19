import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import { runThreadWorkflowCli } from "./cli";
import { listAllThreads } from "./list-all-threads";
import { sortExplicitPinnedThreadIds } from "./pinned-threads";
import { sidebarThreadsFromSearchResult } from "./search-results";
import { resolveStageChord } from "./workflow-chords";
import { resolveWorkflowReorder } from "./workflow-reorder";
import {
  THREAD_WORKFLOW_MIGRATIONS,
  createThreadWorkflowStore,
} from "./store";
import { registerThreadWorkflow } from "./workflow-automation";
import { registerThreadPreviews } from "./thread-preview";
import { WORKFLOW_STAGES } from "./workflow-stage";
import {
  partitionWorkflowThreads,
  rootThreadIdByThreadId,
  type WorkflowHierarchyThread,
} from "./root-thread-ownership";

const workflowStageSchema = z.enum(WORKFLOW_STAGES);
const assignmentSchema = z
  .object({
    threadId: z.string(),
    workflowStage: workflowStageSchema,
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
        rootThreadIds: z.array(z.string().min(1).max(256)).max(10_000),
        childThreadIds: z.array(z.string().min(1).max(256)).max(10_000),
      })
      .strict(),
    output: stateSchema,
  },
  moveThread: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        workflowStage: workflowStageSchema,
        previousThreadId: z.string().min(1).max(256).nullable(),
        nextThreadId: z.string().min(1).max(256).nullable(),
      })
      .strict(),
    output: stateSchema,
  },
  setWorkflowStage: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        workflowStage: workflowStageSchema,
      })
      .strict(),
    output: z.object({ destination: destinationSchema }).strict(),
  },
  reorderThread: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        scope: z.enum(["step", "edge", "stage"]),
        direction: z.union([z.literal(-1), z.literal(1)]),
      })
      .strict(),
    output: stateSchema,
  },
});

export default function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, THREAD_WORKFLOW_MIGRATIONS);
  const store = createThreadWorkflowStore(db);

  function requireRootThread(
    threadId: string,
    threads: readonly WorkflowHierarchyThread[],
  ): void {
    const rootId = rootThreadIdByThreadId(threads).get(threadId);
    if (rootId === threadId) return;
    throw new Error(
      rootId
        ? `Child thread ${threadId} has no workflow stage; its stage belongs to root thread ${rootId}.`
        : `Thread ${threadId} is not a root thread.`,
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
    syncThreads({ rootThreadIds, childThreadIds }) {
      const previousIds = store
        .listState()
        .assignments.map(({ threadId }) => threadId)
        .join("\n");
      const state = store.syncRootThreads(rootThreadIds, childThreadIds);
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
      requireRootThread(input.threadId, threads);
      const state = store.reorderThread(input);
      bb.realtime.publish("state-changed", { threadId: input.threadId });
      return state;
    },
    async setWorkflowStage({ threadId, workflowStage }) {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
      requireRootThread(threadId, threads);
      const chord = resolveStageChord({
        threadId,
        workflowStage,
        threads,
        assignments: store.listState().assignments,
        undoCandidates: store.listUndoCandidates(),
      });
      const stay: ChordDestination = { kind: "stay" };
      if (chord.kind === "none") return { destination: stay };

      if (chord.kind === "restore") {
        store.restoreToTodo(chord.threadId, chord.sortKey);
      } else {
        store.setStage(threadId, chord.workflowStage, "app");
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
    async reorderThread({ threadId, scope, direction }) {
      const threads = await listAllThreads(({ limit, offset }) =>
        bb.sdk.threads.list({ archived: false, limit, offset }),
      );
      requireRootThread(threadId, threads);
      store.ensureThreads([threadId]);
      const move = resolveWorkflowReorder({
        threads,
        assignments: store.listState().assignments,
        threadId,
        workflowStage: store.get(threadId).workflowStage,
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
        move.kind === "stage"
          ? store.setStage(threadId, move.workflowStage)
          : store.reorderThread({
              threadId,
              workflowStage: move.workflowStage,
              previousThreadId: move.previousThreadId,
              nextThreadId: move.nextThreadId,
            });
      bb.realtime.publish("state-changed", { threadId });
      return state;
    },
  });

  bb.cli.register({
    name: "thread-workflow",
    summary: "Organize root threads into workflow stages",
    commands: [
      {
        name: "list",
        summary: "List threads by workflow stage",
        usage: "bb thread-workflow list [--stage <stage>] [--json]",
      },
      {
        name: "show",
        summary: "Show workflow details",
        usage: "bb thread-workflow show [id] [--self] [--json]",
      },
      {
        name: "update",
        summary: "Update a workflow stage or position",
        usage:
          "bb thread-workflow update [id] [--self] [--stage <stage>] [--after <id>] [--before <id>] [--json]",
      },
    ],
    async run(argv, context) {
      let listThreadIds: string[] | undefined;
      let rootIdsByThreadId: ReadonlyMap<string, string | null> | undefined;
      if (["list", "show", "update"].includes(argv[0] ?? "")) {
        const threads = await listAllThreads(({ limit, offset }) =>
          bb.sdk.threads.list({ archived: false, limit, offset }),
        );
        const partition = partitionWorkflowThreads(threads);
        rootIdsByThreadId = rootThreadIdByThreadId(threads);
        if (argv[0] === "list") {
          listThreadIds = partition.rootThreads.map((thread) => thread.id);
        }
        const previousIds = store
          .listState()
          .assignments.map(({ threadId }) => threadId)
          .join("\n");
        const state = store.syncRootThreads(
          partition.rootThreads.map((thread) => thread.id),
          partition.childThreads.map((thread) => thread.id),
        );
        if (
          state.assignments.map(({ threadId }) => threadId).join("\n") !==
          previousIds
        ) {
          bb.realtime.publish("state-changed", { threadId: null });
        }
      }
      const result = runThreadWorkflowCli(store, argv, {
        ...(listThreadIds ? { listThreadIds } : {}),
        ...(rootIdsByThreadId ? { rootIdsByThreadId } : {}),
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

  registerThreadWorkflow(bb, store);
  registerThreadPreviews(bb, store);

  bb.log.info("Thread workflow loaded");
}
