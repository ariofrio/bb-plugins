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
    position: z.number().int(),
    updatedAt: z.number().int(),
  })
  .strict();
const stateSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    assignments: z.array(assignmentSchema),
  })
  .strict();

export const rpcContract = defineRpcContract({
  listState: {
    input: z.null(),
    output: stateSchema,
  },
  moveThread: {
    input: z
      .object({
        threadId: z.string().min(1).max(256),
        status: threadStatusSchema,
        orderedThreadIds: z.array(z.string().min(1).max(256)).min(1).max(10_000),
        expectedRevision: z.number().int().nonnegative(),
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
    moveThread(input) {
      const state = store.moveThread(input);
      bb.realtime.publish("state-changed", { revision: state.revision });
      return state;
    },
  });

  bb.cli.register({
    name: "thread-status",
    summary: "Get and set manual thread workflow statuses",
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
    ],
    run(argv) {
      const result = runThreadStatusCli(store, argv);
      if (argv[0] === "set" && result.exitCode === 0) {
        bb.realtime.publish("state-changed", { revision: store.listState().revision });
      }
      return result;
    },
  });

  bb.events.on("thread.deleted", ({ thread }) => {
    if (store.delete(thread.id)) {
      bb.realtime.publish("state-changed", { revision: store.listState().revision });
    }
  });

  bb.log.info("Thread Status loaded");
}
