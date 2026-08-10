interface AppShortcut {
  alt: boolean;
  control: boolean;
  key: string;
  meta: boolean;
  mod: boolean;
  shift: boolean;
}

interface AppKeybinding {
  command: string;
  desktopOnly: boolean;
  shortcut: AppShortcut;
}

interface SystemConfig {
  keybindings: AppKeybinding[];
}

export interface NativeCommandTarget {
  dispatchEvent(event: KeyboardEvent): boolean;
}

interface NativeCommandDelegateOptions {
  command: string;
  createEvent(type: string, init: KeyboardEventInit): KeyboardEvent;
  fetchConfig(): Promise<unknown>;
  isMac: boolean;
  target: NativeCommandTarget;
}

const DEFAULT_THREAD_NEW_SHORTCUT: AppShortcut = {
  alt: false,
  control: false,
  key: "o",
  meta: false,
  mod: true,
  shift: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isShortcut(value: unknown): value is AppShortcut {
  return (
    isRecord(value) &&
    typeof value.alt === "boolean" &&
    typeof value.control === "boolean" &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.meta === "boolean" &&
    typeof value.mod === "boolean" &&
    typeof value.shift === "boolean"
  );
}

function parseConfig(value: unknown): SystemConfig | null {
  if (!isRecord(value) || !Array.isArray(value.keybindings)) return null;
  const keybindings = value.keybindings.flatMap((binding) => {
    if (
      !isRecord(binding) ||
      typeof binding.command !== "string" ||
      typeof binding.desktopOnly !== "boolean" ||
      !isShortcut(binding.shortcut)
    ) {
      return [];
    }
    return [
      {
        command: binding.command,
        desktopOnly: binding.desktopOnly,
        shortcut: binding.shortcut,
      },
    ];
  });
  return { keybindings };
}

function keyboardCode(key: string): string {
  if (/^[a-z]$/iu.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/u.test(key)) return `Digit${key}`;
  return key;
}

export function createNativeCommandDelegate({
  command,
  createEvent,
  fetchConfig,
  isMac,
  target,
}: NativeCommandDelegateOptions) {
  const delegatedEvents = new WeakSet<KeyboardEvent>();
  let shortcutPromise: Promise<AppShortcut> | null = null;

  const loadShortcut = (): Promise<AppShortcut> => {
    shortcutPromise ??= fetchConfig()
      .then((value) => {
        const config = parseConfig(value);
        return (
          config?.keybindings
            .filter(
              (binding) =>
                binding.command === command && !binding.desktopOnly,
            )
            .at(-1)?.shortcut ?? DEFAULT_THREAD_NEW_SHORTCUT
        );
      })
      .catch(() => DEFAULT_THREAD_NEW_SHORTCUT);
    return shortcutPromise;
  };

  return {
    async dispatch(): Promise<void> {
      const shortcut = await loadShortcut();
      const event = createEvent("keydown", {
        altKey: shortcut.alt,
        bubbles: true,
        cancelable: true,
        code: keyboardCode(shortcut.key),
        composed: true,
        ctrlKey: shortcut.control || (shortcut.mod && !isMac),
        key: shortcut.key,
        metaKey: shortcut.meta || (shortcut.mod && isMac),
        shiftKey: shortcut.shift,
      });
      delegatedEvents.add(event);
      target.dispatchEvent(event);
    },
    isDelegatedEvent(event: KeyboardEvent): boolean {
      return delegatedEvents.has(event);
    },
    prefetch(): Promise<void> {
      return loadShortcut().then(() => undefined);
    },
  };
}
