import { useEffect, useState } from 'react';

/**
 * Custom Hook useDebounce<T>
 * Menunda pembaruan nilai hingga pengguna berhenti mengetik selama `delay` ms (default 400ms).
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delay]);

  return debouncedValue;
}
