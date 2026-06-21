"use client";

import { useCallback, useEffect, useRef } from "react";

// Returns a stable function identity that always calls the latest callback.
// Lets effects depend on inputs without re-creating the callback each render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCallbackRef<T extends (...args: any[]) => any>(cb: T): T {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(((...args: unknown[]) => ref.current(...args)) as T, []);
}
