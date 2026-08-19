import { useCallback, useEffect, useState } from "react";

export function parseStoredBoolean(
  raw: string | null,
  defaultValue: boolean,
  legacyRaw: string | null = null,
): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (legacyRaw === "true") return true;
  if (legacyRaw === "false") return false;
  return defaultValue;
}

function readStoredBoolean(
  key: string,
  defaultValue: boolean,
  legacyKey?: string,
): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    return parseStoredBoolean(
      window.localStorage.getItem(key),
      defaultValue,
      legacyKey ? window.localStorage.getItem(legacyKey) : null,
    );
  } catch {
    return defaultValue;
  }
}

export function usePersistentBoolean(
  key: string,
  defaultValue: boolean,
  legacyKey?: string,
): readonly [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() =>
    readStoredBoolean(key, defaultValue, legacyKey),
  );

  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (event.key === key) {
        setValue(parseStoredBoolean(event.newValue, defaultValue));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultValue, key]);

  const setPersistentValue = useCallback(
    (nextValue: boolean) => {
      setValue(nextValue);
      try {
        window.localStorage.setItem(key, String(nextValue));
      } catch {
        // Storage can be unavailable in privacy-restricted clients; the
        // setting still works for the current mount.
      }
    },
    [key],
  );

  return [value, setPersistentValue] as const;
}
