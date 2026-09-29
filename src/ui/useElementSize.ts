import { useCallback, useState } from 'react';

/** Measures an element (content box) and follows its resizes. Attach the returned ref. */
export function useElementSize<T extends Element>() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Stable identity, otherwise React would detach and reattach the observer on every render.
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
