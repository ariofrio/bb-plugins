import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";
import catalogMetadata from "./icon-catalog.json";
import { CATALOG_ICONS } from "./icon-catalog.generated";
import {
  DEFAULT_PROJECT_ICON,
  PERSONAL_PROJECT_ICON,
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

// Consumers render the glyph without shipping the catalog themselves, so the
// drawing for each chosen icon travels with it.
const glyphSchema = z
  .array(z.tuple([z.string(), z.record(z.string(), z.any())]).readonly())
  .readonly();

const iconsSchema = z
  .object({
    icons: z.array(projectIconSchema.extend({ glyph: glyphSchema })),
    defaults: z
      .object({ project: glyphSchema, personal: glyphSchema })
      .strict(),
  })
  .strict();

const catalogSchema = z
  .object({
    icons: z.array(
      z
        .object({
          name: z.string(),
          category: z.string(),
          tags: z.array(z.string()),
          glyph: glyphSchema,
        })
        .strict(),
    ),
  })
  .strict();

export const rpcContract = defineRpcContract({
  /**
   * The whole picker catalog. It lives here rather than in the app bundle so
   * every client load stays small; the picker asks for it once, on open.
   */
  listIconCatalog: {
    input: z.null(),
    output: catalogSchema,
  },
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

  const glyphOf = (icon: string) =>
    CATALOG_ICONS[icon] ?? CATALOG_ICONS[DEFAULT_PROJECT_ICON] ?? [];

  const view = () => ({
    icons: store.list().map((icon) => ({ ...icon, glyph: glyphOf(icon.icon) })),
    defaults: {
      project: glyphOf(DEFAULT_PROJECT_ICON),
      personal: glyphOf(PERSONAL_PROJECT_ICON),
    },
  });

  const publish = (projectId: string) => {
    bb.realtime.publish("icons-changed", { projectId });
    return view();
  };

  const catalog = {
    icons: (catalogMetadata as Array<{
      name: string;
      category: string;
      tags: string[];
    }>).flatMap((entry) => {
      const glyph = CATALOG_ICONS[entry.name];
      return glyph === undefined
        ? []
        : [
            {
              name: entry.name,
              category: entry.category,
              tags: entry.tags,
              glyph,
            },
          ];
    }),
  };

  bb.rpc.register(rpcContract, {
    listIconCatalog: () => catalog,
    listProjectIcons: () => view(),
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
