import type { PluginSidebarThreadsState } from "@bb/plugin-sdk/app";

export function shouldSyncThreads({
  hasOrganization,
  loadError,
  sidebarStatus,
  syncInFlight,
  unsyncedCount,
}: {
  hasOrganization: boolean;
  loadError: string | null;
  sidebarStatus: PluginSidebarThreadsState["status"];
  syncInFlight: boolean;
  unsyncedCount: number;
}): boolean {
  return (
    hasOrganization &&
    loadError === null &&
    sidebarStatus === "ready" &&
    !syncInFlight &&
    unsyncedCount > 0
  );
}
