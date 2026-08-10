import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";

const projectId = z.string().min(1);

export const rpcContract = defineRpcContract({
  renameProject: {
    input: z
      .object({
        projectId,
        name: z.string().trim().min(1),
      })
      .strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
  removeProject: {
    input: z.object({ projectId }).strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
});

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async renameProject({ projectId, name }) {
      await bb.sdk.projects.update({ projectId, name });
      return { ok: true as const };
    },
    async removeProject({ projectId }) {
      await bb.sdk.projects.delete({ projectId });
      return { ok: true as const };
    },
  });
}
