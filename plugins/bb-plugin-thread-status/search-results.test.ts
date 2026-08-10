import { describe, expect, it } from "vitest";
import { sidebarThreadsFromSearchResult } from "./search-results";

function thread(id: string, archived = false) {
  return {
    id,
    projectId: "proj_1",
    title: `Title ${id}`,
    titleFallback: null,
    parentThreadId: null,
    providerId: "codex",
    archivedAt: archived ? 123 : null,
  };
}

describe("sidebarThreadsFromSearchResult", () => {
  it("keeps active and archived bb search matches in host group order", () => {
    expect(
      sidebarThreadsFromSearchResult({
        active: {
          results: [
            { thread: thread("thr_message_match") },
            { thread: thread("thr_title_match") },
          ],
        },
        archived: {
          results: [{ thread: thread("thr_archived_match", true) }],
        },
      }),
    ).toMatchObject([
      { id: "thr_message_match", isArchived: false },
      { id: "thr_title_match", isArchived: false },
      { id: "thr_archived_match", isArchived: true },
    ]);
  });

  it("deduplicates defensive overlap between search groups", () => {
    expect(
      sidebarThreadsFromSearchResult({
        active: { results: [{ thread: thread("thr_1") }] },
        archived: { results: [{ thread: thread("thr_1", true) }] },
      }),
    ).toHaveLength(1);
  });
});
