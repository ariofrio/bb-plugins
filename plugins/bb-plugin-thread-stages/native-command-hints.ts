interface NativeCommandHintTarget {
  dispatchEvent(event: KeyboardEvent): boolean;
}

type KeyboardEventFactory = (
  type: string,
  init: KeyboardEventInit,
) => KeyboardEvent;

export function notifyNativeShortcutHandled(
  target: NativeCommandHintTarget,
  createEvent: KeyboardEventFactory,
): void {
  target.dispatchEvent(
    createEvent("keydown", {
      bubbles: true,
      cancelable: true,
      code: "Unidentified",
      key: "Unidentified",
    }),
  );
}
