/** Restore the plugin's CSS scope on Radix content portaled to the document. */
declare const __BB_PLUGIN_ID__: string | undefined;

export function usePortalScopeProps(): {
  "data-bb-portaled-overlay": "";
  "data-bb-plugin-root": "";
  "data-bb-plugin"?: string;
} {
  const pluginId =
    typeof __BB_PLUGIN_ID__ === "string" ? __BB_PLUGIN_ID__ : undefined;
  return {
    "data-bb-portaled-overlay": "",
    "data-bb-plugin-root": "",
    ...(pluginId === undefined ? {} : { "data-bb-plugin": pluginId }),
  };
}

export const portalScopeProps = usePortalScopeProps;
