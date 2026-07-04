"use client";

import { useCallback, useState } from "react";

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    const value = window.localStorage.getItem(key);
    if (!value) return initialValue;

    try {
      return JSON.parse(value) as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setState(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    },
    [key]
  );

  return [state, setValue] as const;
};