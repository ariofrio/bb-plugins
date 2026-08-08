import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { z } from "zod";

export const rpcContract = defineRpcContract({
  archiveThread: {
    input: z.object({ threadId: z.string().min(1) }).strict(),
    output: z.object({ archivedThreadIds: z.array(z.string()) }).strict(),
  },
});

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async archiveThread({ threadId }) {
      const result = await bb.sdk.threads.archiveAll({ threadId });
      return { archivedThreadIds: result.archivedThreadIds };
    },
  });

  bb.log.info("Missing native shortcuts loaded");
}
