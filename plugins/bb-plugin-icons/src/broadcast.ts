/**
 * Plugins cannot subscribe to each other's realtime channels, and the sidebar
 * that draws these icons lives in another plugin, so edits are announced on a
 * broadcast channel that any plugin in the app can listen on. Thread stages
 * mirrors this name in its own icons module.
 */
export const ICONS_CHANNEL = "bb.icons";

export function announceIconsChanged(): void {
  try {
    const channel = new BroadcastChannel(ICONS_CHANNEL);
    channel.postMessage({ type: "icons-changed" });
    channel.close();
  } catch {
    // Clients without BroadcastChannel fall back to the listener's own
    // refresh-on-focus.
  }
}
