import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PROJECT_ICON_MIGRATIONS,
  createProjectIconStore,
  defaultProjectIcon,
  isEditableProject,
  type ProjectIconStore,
} from "./store";

describe("project icon store", () => {
  let db: Database.Database;
  let store: ProjectIconStore;

  beforeEach(() => {
    db = new Database(":memory:");
    for (const migration of PROJECT_ICON_MIGRATIONS) db.exec(migration);
    store = createProjectIconStore(db);
  });

  afterEach(() => db.close());

  it("keeps one icon per project", () => {
    store.set({ projectId: "proj_a", icon: "rocket", color: "purple" });
    store.set({ projectId: "proj_b", icon: "coffee-01", color: null });
    store.set({ projectId: "proj_a", icon: "flash", color: null });

    expect(store.list()).toEqual([
      { projectId: "proj_a", icon: "flash", color: null },
      { projectId: "proj_b", icon: "coffee-01", color: null },
    ]);
  });

  it("clears a project back to its default", () => {
    store.set({ projectId: "proj_a", icon: "rocket", color: "red" });

    expect(store.clear("proj_a")).toBe(true);
    expect(store.clear("proj_a")).toBe(false);
    expect(store.list()).toEqual([]);
  });

  it("defaults projects to a folder and the personal project to a chat bubble", () => {
    expect(defaultProjectIcon("proj_6dp2k86nnw")).toBe("folder-01");
    expect(defaultProjectIcon("proj_personal")).toBe("bubble-chat");
  });

  it("leaves the personal project's icon fixed", () => {
    expect(isEditableProject("proj_6dp2k86nnw")).toBe(true);
    expect(isEditableProject("proj_personal")).toBe(false);
  });
});
