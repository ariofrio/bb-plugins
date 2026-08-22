import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { listAllThreads } from "./list-all-threads";
import type { ThreadWorkflowStore } from "./store";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const AUTO_ARCHIVE_OPTIONS = [
  "Never",
  "1 day",
  "7 days",
  "30 days",
] as const;

export function autoArchiveDelayMs(value: unknown): number | null {
  switch (value) {
    case "1 day":
      return DAY_MS;
    case "7 days":
      return 7 * DAY_MS;
    case "30 days":
      return 30 * DAY_MS;
    case "Never":
    default:
      return null;
  }
}

type ListedThread = Awaited<
  ReturnType<BbPluginApi["sdk"]["threads"]["list"]>
>[number];

function hasActiveWork(thread: ListedThread): boolean {
  if (["active", "starting", "stopping"].includes(thread.status)) return true;
  if (
    thread.runtime.displayStatus !== "idle" &&
    thread.runtime.displayStatus !== "error"
  ) {
    return true;
  }
  return Object.values(thread.activity).some((count) => count > 0);
}

function isUnread(thread: ListedThread): boolean {
  return (
    thread.lastReadAt === null || thread.lastReadAt < thread.latestAttentionAt
  );
}

export async function archiveEligibleCompletedThreads(
  bb: Pick<BbPluginApi, "sdk" | "log">,
  store: ThreadWorkflowStore,
  delayMs: number,
  now = Date.now(),
): Promise<string[]> {
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    throw new Error("Auto-archive delay must be positive.");
  }

  const candidates = store.listCompletedBefore(now - delayMs);
  if (candidates.length === 0) return [];

  const threads = await listAllThreads(({ limit, offset }) =>
    bb.sdk.threads.list({
      archived: false,
      includeHidden: true,
      limit,
      offset,
    }),
  );
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const rootsWithUnsafeDescendants = new Set<string>();
  for (const thread of threads) {
    if (
      thread.parentThreadId === null ||
      (!hasActiveWork(thread) &&
        !thread.hasPendingInteraction &&
        thread.pinnedAt === null)
    ) {
      continue;
    }
    let ancestorId: string | null = thread.parentThreadId;
    const visited = new Set<string>();
    while (ancestorId !== null && !visited.has(ancestorId)) {
      visited.add(ancestorId);
      rootsWithUnsafeDescendants.add(ancestorId);
      ancestorId = threadById.get(ancestorId)?.parentThreadId ?? null;
    }
  }

  const archived: string[] = [];
  for (const candidate of candidates) {
    const thread = threadById.get(candidate.threadId);
    if (
      !thread ||
      thread.parentThreadId !== null ||
      thread.visibility !== "visible" ||
      thread.archivedAt !== null ||
      thread.pinnedAt !== null ||
      thread.hasPendingInteraction ||
      hasActiveWork(thread) ||
      isUnread(thread) ||
      rootsWithUnsafeDescendants.has(thread.id)
    ) {
      continue;
    }
    try {
      await bb.sdk.threads.archive({ threadId: thread.id });
      archived.push(thread.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      bb.log.warn(`Could not auto-archive ${thread.id}: ${message}`);
    }
  }
  return archived;
}

export function registerCompletedAutoArchive(
  bb: BbPluginApi,
  store: ThreadWorkflowStore,
  getRetention: () => Promise<unknown>,
): void {
  bb.background.schedule("completed-auto-archive", "17 * * * *", async () => {
    const delayMs = autoArchiveDelayMs(await getRetention());
    if (delayMs === null) return;
    const archived = await archiveEligibleCompletedThreads(bb, store, delayMs);
    if (archived.length > 0) {
      bb.log.info(`Auto-archived ${archived.length} Completed thread(s).`);
    }
  });
}
