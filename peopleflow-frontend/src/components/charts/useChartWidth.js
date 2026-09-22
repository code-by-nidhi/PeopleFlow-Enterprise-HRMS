import { useEffect, useRef, useState } from 'react';

/**
 * Measures the rendered width of a chart container so SVG charts can be drawn
 * in real pixels (keeps label typography crisp instead of scaling with viewBox).
 */
export function useChartWidth(fallback = 560) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured > 0) setWidth(measured);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
