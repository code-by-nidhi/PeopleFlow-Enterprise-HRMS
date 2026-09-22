import React from 'react';

/**
 * Floating tooltip shared by every chart. Positioned in pixels relative to the
 * chart wrapper (which must be position: relative).
 */
export function ChartTooltip({ x, y, title, rows = [] }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -115%)',
        pointerEvents: 'none',
        backgroundColor: 'var(--chart-tooltip-bg)',
        color: '#ffffff',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem 0.625rem',
        fontSize: '0.75rem',
        lineHeight: 1.5,
        boxShadow: 'var(--shadow-lg)',
        whiteSpace: 'nowrap',
        zIndex: 5,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: rows.length ? '0.25rem' : 0 }}>{title}</div>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: row.color, flexShrink: 0 }} />
          <span style={{ color: '#cbd5e1' }}>{row.label}</span>
          <span style={{ fontWeight: 700, marginLeft: 'auto', paddingLeft: '1rem' }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Legend — identity is never carried by color alone. */
export function ChartLegend({ items = [], style }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem 1.25rem',
        marginTop: '0.875rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        ...style,
      }}
    >
      {items.map((item) => (
        <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 9, height: 9, borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
          {item.value !== undefined && <span>{item.value}</span>}
        </span>
      ))}
    </div>
  );
}
