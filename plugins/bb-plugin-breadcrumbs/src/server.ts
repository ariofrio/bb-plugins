import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

const projectId = z.string().min(1);
const sectionId = z.string().min(1);
const ok = z.object({ ok: z.literal(true) }).strict();

export const CRUMBS = {
  showSection: {
    type: "boolean",
    label: "Show the section",
    description: "Put the thread's sidebar section before its project.",
    default: true,
  },
  showProject: {
    type: "boolean",
    label: "Show the project",
    description: "Put the thread's project before its title.",
    default: true,
  },
  showAncestors: {
    type: "boolean",
    label: "Show the threads it came from",
    description:
      "Put every thread this one was forked or spawned under before its title.",
    default: true,
  },
} as const;

export const rpcContract = defineRpcContract({
  renameProject: {
    input: z.object({ projectId, name: z.string().trim().min(1) }).strict(),
    output: ok,
  },
  removeProject: {
    input: z.object({ projectId }).strict(),
    output: ok,
  },
  /**
   * bb serves no section list to the app, and publishes no event when one is
   * created, renamed, or removed, so the crumb reads names here and refetches
   * on its own.
   */
  listSections: {
    input: z.null(),
    output: z
      .object({
        sections: z.array(
          z.object({ id: z.string(), name: z.string() }).strict(),
        ),
      })
      .strict(),
  },
  /**
   * The thread's section, resolved here rather than from the sidebar's live
   * view. That view hydrates a thread's sectionId separately from the thread
   * itself, so a header could mount beside a root thread still reporting no
   * section and never hear otherwise — bb publishes no section event.
   */
  sectionForThread: {
    input: z.object({ threadId: z.string().min(1) }).strict(),
    output: z
      .object({
        sectionId: z.string().nullable(),
        sectionName: z.string().nullable(),
      })
      .strict(),
  },
  renameSection: {
    input: z.object({ sectionId, name: z.string().trim().min(1) }).strict(),
    output: ok,
  },
  removeSection: {
    input: z.object({ sectionId }).strict(),
    output: ok,
  },
  /** Which crumbs to draw; the header slot could read these from useSettings, but one call keeps the crumb's own loading in step. */
  listCrumbs: {
    input: z.null(),
    output: z
      .object({
        showSection: z.boolean(),
        showProject: z.boolean(),
        showAncestors: z.boolean(),
      })
      .strict(),
  },
});

export default function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define(CRUMBS);

  bb.rpc.register(rpcContract, {
    async renameProject({ projectId, name }) {
      await bb.sdk.projects.update({ projectId, name });
      return { ok: true as const };
    },
    async removeProject({ projectId }) {
      await bb.sdk.projects.delete({ projectId });
      return { ok: true as const };
    },
    async listSections() {
      const sections = await bb.sdk.threadSections.list();
      return {
        sections: sections.map(({ id, name }) => ({ id, name })),
      };
    },
    async sectionForThread({ threadId }) {
      // Sections attach to root threads; a child inherits its root's.
      const seen = new Set<string>();
      let current: { parentThreadId?: string | null; sectionId?: string | null } | null =
        await bb.sdk.threads.get({ threadId }).catch(() => null);
      let id = threadId;
      while (
        current !== null &&
        (current.parentThreadId ?? null) !== null &&
        !seen.has(id)
      ) {
        seen.add(id);
        id = current.parentThreadId as string;
        current = await bb.sdk.threads.get({ threadId: id }).catch(() => null);
      }
      const sectionId = current?.sectionId ?? null;
      if (sectionId === null) return { sectionId: null, sectionName: null };
      const sections = await bb.sdk.threadSections.list().catch(() => []);
      return {
        sectionId,
        sectionName:
          sections.find((section) => section.id === sectionId)?.name ?? null,
      };
    },
    async renameSection({ sectionId, name }) {
      await bb.sdk.threadSections.update({ id: sectionId, name });
      return { ok: true as const };
    },
    async removeSection({ sectionId }) {
      // bb moves the section's threads back to Unorganized itself.
      await bb.sdk.threadSections.delete({ id: sectionId });
      return { ok: true as const };
    },
    async listCrumbs() {
      const { showSection, showProject, showAncestors } = await settings.get();
      return { showSection, showProject, showAncestors };
    },
  });
}
