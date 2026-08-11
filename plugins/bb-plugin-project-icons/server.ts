import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import {
  PROJECT_ICON_COLORS,
  PROJECT_ICON_MIGRATIONS,
  createProjectIconStore,
  isEditableProject,
} from "./store";

const projectIconSchema = z
  .object({
    projectId: z.string().min(1).max(256),
    icon: z.string().min(1).max(128),
    color: z.enum(PROJECT_ICON_COLORS).nullable(),
  })
  .strict();

const iconsSchema = z
  .object({ icons: z.array(projectIconSchema) })
  .strict();

export const rpcContract = defineRpcContract({
  listProjectIcons: {
    input: z.null(),
    output: iconsSchema,
  },
  setProjectIcon: {
    input: projectIconSchema,
    output: iconsSchema,
  },
  clearProjectIcon: {
    input: z.object({ projectId: z.string().min(1).max(256) }).strict(),
    output: iconsSchema,
  },
});

export default function plugin(bb: BbPluginApi) {
  const db = bb.storage.database();
  bb.storage.migrate(db, PROJECT_ICON_MIGRATIONS);
  const store = createProjectIconStore(db);

  const publish = (projectId: string) => {
    bb.realtime.publish("icons-changed", { projectId });
    return { icons: store.list() };
  };

  bb.rpc.register(rpcContract, {
    listProjectIcons: () => ({ icons: store.list() }),
    setProjectIcon(input) {
      if (!isEditableProject(input.projectId)) {
        throw new Error("The personal project's icon is fixed.");
      }
      store.set(input);
      return publish(input.projectId);
    },
    clearProjectIcon({ projectId }) {
      store.clear(projectId);
      return publish(projectId);
    },
  });

  // A deleted project's icon would otherwise linger forever; bb reports
  // deletions through project changes rather than a plugin lifecycle event.
  bb.background.service("project-icon-cleanup", {
    async start(signal) {
      const unsubscribe = bb.sdk.subscribe({
        event: "project:changed",
        callback(event) {
          if (!event.id || !event.changes.includes("project-deleted")) return;
          if (store.clear(event.id)) {
            bb.realtime.publish("icons-changed", { projectId: event.id });
          }
        },
      });
      try {
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      } finally {
        unsubscribe();
      }
    },
  });
}
