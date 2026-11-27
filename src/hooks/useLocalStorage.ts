import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

function resolveInitialValue<T>(initialValue: T | (() => T)): T {
  if (typeof initialValue === 'function') {
    return (initialValue as () => T)();
  }
  return initialValue;
}

/**
 * Custom Hook useLocalStorage<T>
 * Membaca nilai awal dari window.localStorage secara aman (dengan fallback)
 * serta menyinkronkan setiap perubahan state kembali ke localStorage.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const fallback = resolveInitialValue(initialValue);

    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }

      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(fallback) && !Array.isArray(parsed)) {
        return fallback;
      }

      return parsed as T;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // Abaikan error apabila kuota localStorage penuh atau diblokir browser
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
