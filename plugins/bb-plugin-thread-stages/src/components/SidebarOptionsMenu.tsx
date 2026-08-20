import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRef } from "react";
import { portalScopeProps } from "../lib/portal-scope";
import { DROPDOWN_MENU_MOTION_CLASS } from "../lib/menu-motion";
import { Icon } from "./Icon";

const CONTENT_CLASS =
  `z-50 min-w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${DROPDOWN_MENU_MOTION_CLASS}`;
const ITEM_CLASS =
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-[0.3125rem] text-xs outline-none transition-colors data-[highlighted]:bg-state-hover data-[highlighted]:text-foreground";
const TRIGGER_CLASS =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none ring-sidebar-ring transition-colors focus-visible:ring-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground";
const PANEL_OPTIONS_TRIGGER_CLASS =
  "relative m-1 h-5 w-5 p-0 hover:bg-state-hover hover:text-foreground after:absolute after:left-1/2 after:top-1/2 after:h-7 after:w-7 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] max-md:pointer-coarse:m-0 max-md:pointer-coarse:h-9 max-md:pointer-coarse:w-9 max-md:pointer-coarse:after:hidden";

interface ThreadFilterOptionsMenuProps {
  onHide: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function ThreadFilterOptionsMenu({
  onHide,
  onOpenChange,
}: ThreadFilterOptionsMenuProps) {
  const pointerDismissedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (open) pointerDismissedRef.current = false;
        onOpenChange?.(open);
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Projects and sections options"
          className={`${TRIGGER_CLASS} ${PANEL_OPTIONS_TRIGGER_CLASS}`}
        >
          <Icon
            name="MoreHorizontal"
            className="size-4 max-md:pointer-coarse:size-5"
            aria-hidden
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          {...portalScopeProps()}
          align="end"
          sideOffset={4}
          className={CONTENT_CLASS}
          onPointerDownOutside={() => {
            pointerDismissedRef.current = true;
          }}
          onCloseAutoFocus={(event) => {
            if (!pointerDismissedRef.current) return;
            pointerDismissedRef.current = false;
            event.preventDefault();
            triggerRef.current?.blur();
          }}
        >
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={onHide}>
            <Icon name="EyeOff" className="size-4 shrink-0" aria-hidden />
            Hide from sidebar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
