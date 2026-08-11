import type BetterSqlite3 from "better-sqlite3";

type Database = BetterSqlite3.Database;

export const PROJECT_ICON_MIGRATIONS = [
  `
    CREATE TABLE IF NOT EXISTS project_icon (
      project_id TEXT PRIMARY KEY,
      icon TEXT NOT NULL,
      color TEXT,
      updated_at INTEGER NOT NULL
    );
  `,
];

/** bb keeps project-less threads in the personal project. */
export const PERSONAL_PROJECT_ID = "proj_personal";
export const DEFAULT_PROJECT_ICON = "folder-01";
export const PERSONAL_PROJECT_ICON = "bubble-chat";

/** bb's own palette, the one behind favicon colors. */
export const PROJECT_ICON_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;

export type ProjectIconColor = (typeof PROJECT_ICON_COLORS)[number];

export interface ProjectIcon {
  projectId: string;
  icon: string;
  /** Null means the icon inherits the surrounding text color. */
  color: ProjectIconColor | null;
}

export interface ProjectIconStore {
  list(): ProjectIcon[];
  set(icon: ProjectIcon): void;
  clear(projectId: string): boolean;
}

export function createProjectIconStore(db: Database): ProjectIconStore {
  const listRows = db.prepare(`
    SELECT project_id, icon, color
    FROM project_icon
    ORDER BY project_id
  `);
  const upsertRow = db.prepare(`
    INSERT INTO project_icon(project_id, icon, color, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      icon = excluded.icon,
      color = excluded.color,
      updated_at = excluded.updated_at
  `);
  const deleteRow = db.prepare("DELETE FROM project_icon WHERE project_id = ?");

  return {
    list() {
      return (
        listRows.all() as Array<{
          project_id: string;
          icon: string;
          color: string | null;
        }>
      ).map((row) => ({
        projectId: row.project_id,
        icon: row.icon,
        color: (row.color as ProjectIconColor | null) ?? null,
      }));
    },
    set({ projectId, icon, color }) {
      upsertRow.run(projectId, icon, color, Date.now());
    },
    clear(projectId) {
      return deleteRow.run(projectId).changes > 0;
    },
  };
}

/** The icon a project shows when the user has not chosen one. */
export function defaultProjectIcon(projectId: string): string {
  return projectId === PERSONAL_PROJECT_ID
    ? PERSONAL_PROJECT_ICON
    : DEFAULT_PROJECT_ICON;
}

/** Whether the user may choose this project's icon. */
export function isEditableProject(projectId: string): boolean {
  return projectId !== PERSONAL_PROJECT_ID;
}
