import type { PluginSidebarThreadSplit } from "@bb/plugin-sdk/app";

export function SplitPaneMiniMap({
  layout,
  label,
}: {
  layout: NonNullable<PluginSidebarThreadSplit["layout"]>;
  label: string;
}) {
  const representsFocusedPane = layout.panes.some(
    (pane) => pane.isMe && pane.isFocused,
  );
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={`pointer-events-none size-3.5 shrink-0 ${
        representsFocusedPane ? "" : "opacity-60"
      }`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      {layout.panes.map((pane) => {
        const inset = pane.isMe ? 0 : 0.5;
        return (
          <rect
            key={pane.paneId}
            x={1 + pane.rect.x * 12 + inset}
            y={1 + pane.rect.y * 12 + inset}
            width={Math.max(pane.rect.width * 12 - inset * 2, 0)}
            height={Math.max(pane.rect.height * 12 - inset * 2, 0)}
            strokeWidth={pane.isMe ? 0 : 1}
            className={
              pane.isMe
                ? pane.isFocused
                  ? "fill-primary/70 stroke-none"
                  : "fill-muted-foreground/45 stroke-none"
                : "fill-none stroke-muted-foreground/30"
            }
          />
        );
      })}
    </svg>
  );
}
