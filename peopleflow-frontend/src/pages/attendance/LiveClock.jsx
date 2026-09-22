import React, { useEffect, useState } from 'react';
import { formatDuration } from '../../utils/format';

/**
 * Ticks every second. With `since` it shows the elapsed time (HH:MM:SS),
 * otherwise the current wall-clock time. Isolated so only this node re-renders.
 */
export function LiveClock({ since, className = 'checkin-clock' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const text = since
    ? formatDuration(now - new Date(since).getTime())
    : new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return <div className={className} aria-live="off">{text}</div>;
}
