import { describe, expect, it } from "vitest";
import {
  LAST_THREAD_PROJECT_ID_STORAGE_KEY,
  readLastThreadProjectId,
  rememberThreadProject,
} from "./last-thread-project";

function memoryStorage(initialValue: string | null = null): Storage {
  const values = new Map<string, string>();
  if (initialValue !== null) {
    values.set(LAST_THREAD_PROJECT_ID_STORAGE_KEY, initialValue);
  }
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("last selected thread project", () => {
  it("remembers project-scoped and personal thread projects", () => {
    const storage = memoryStorage();

    rememberThreadProject(storage, {
      projectId: "proj_one",
      threadId: "thr_one",
    });
    expect(readLastThreadProjectId(storage)).toBe("proj_one");

    rememberThreadProject(storage, {
      projectId: null,
      threadId: "thr_personal",
    });
    expect(readLastThreadProjectId(storage)).toBe("proj_personal");
  });

  it("does not replace the remembered project on a non-thread route", () => {
    const storage = memoryStorage("proj_previous");

    rememberThreadProject(storage, {
      projectId: "proj_compose",
      threadId: null,
    });

    expect(readLastThreadProjectId(storage)).toBe("proj_previous");
  });

  it("ignores empty persisted values", () => {
    expect(readLastThreadProjectId(memoryStorage(""))).toBeNull();
  });
});
