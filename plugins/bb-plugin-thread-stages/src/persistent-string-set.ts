import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export function parseStoredStringSet(
  raw: string | null,
  allowedValues?: ReadonlySet<string>,
  defaultValues?: ReadonlySet<string>,
  valueAliases?: ReadonlyMap<string, string>,
): Set<string> {
  if (raw === null) {
    return new Set(
      [...(defaultValues ?? [])].filter(
        (value) => allowedValues === undefined || allowedValues.has(value),
      ),
    );
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .filter((value): value is string => typeof value === "string")
        .map((value) => valueAliases?.get(value) ?? value)
        .filter(
          (value) => allowedValues === undefined || allowedValues.has(value),
        ),
    );
  } catch {
    return new Set();
  }
}

function readStoredStringSet(
  key: string,
  allowedValues?: ReadonlySet<string>,
  defaultValues?: ReadonlySet<string>,
  valueAliases?: ReadonlyMap<string, string>,
): Set<string> {
  try {
    return parseStoredStringSet(
      window.localStorage.getItem(key),
      allowedValues,
      defaultValues,
      valueAliases,
    );
  } catch {
    return new Set(defaultValues);
  }
}

export function usePersistentStringSet(
  key: string,
  allowedValues?: ReadonlySet<string>,
  defaultValues?: ReadonlySet<string>,
  valueAliases?: ReadonlyMap<string, string>,
): [Set<string>, Dispatch<SetStateAction<Set<string>>>] {
  const [values, setValues] = useState(() =>
    readStoredStringSet(key, allowedValues, defaultValues, valueAliases),
  );

  useEffect(() => {
    function onStorage(event: StorageEvent): void {
      if (event.key === key) {
        setValues(
          parseStoredStringSet(
            event.newValue,
            allowedValues,
            defaultValues,
            valueAliases,
          ),
        );
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [allowedValues, defaultValues, key, valueAliases]);

  const setPersistentValues = useCallback<
    Dispatch<SetStateAction<Set<string>>>
  >(
    (nextValue) => {
      setValues((current) => {
        const next =
          typeof nextValue === "function" ? nextValue(current) : nextValue;
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          // Storage can be unavailable in privacy-restricted clients; collapse
          // still works for the current mount.
        }
        return next;
      });
    },
    [key],
  );

  return [values, setPersistentValues];
}
