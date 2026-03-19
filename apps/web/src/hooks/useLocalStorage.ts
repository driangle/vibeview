import { useState, useCallback } from 'react';

const PREFIX = 'vibeview:';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const prefixedKey = PREFIX + key;

  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      return item !== null ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(prefixedKey, JSON.stringify(next));
        } catch {
          // Storage full or unavailable — keep in-memory value
        }
        return next;
      });
    },
    [prefixedKey],
  );

  return [stored, setValue];
}
