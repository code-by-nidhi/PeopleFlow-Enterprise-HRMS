import React from 'react';

/**
 * Horizontal magnitude list — for ranked categories where a bar chart would be
 * heavier than the data deserves.
 * items: [{ label, value, max, color, caption }]
 */
export function ProgressList({ items = [], unit = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.map((item) => {
        const pct = Math.min(Math.round((item.value / (item.max || 100)) * 100), 100);
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {item.caption ?? `${item.value}${unit}`}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-alt)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: item.color,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
