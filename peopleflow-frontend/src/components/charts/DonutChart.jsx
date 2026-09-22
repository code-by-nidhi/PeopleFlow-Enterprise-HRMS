import React, { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';

/**
 * Donut chart with a centred headline figure and a labelled legend list.
 * data: [{ label, value, color }]
 */
export function DonutChart({
  data = [],
  size = 190,
  thickness = 24,
  centerValue,
  centerLabel,
  unit = '',
}) {
  const [active, setActive] = useState(null);

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data.map((d) => {
    const length = (d.value / total) * circumference;
    const midAngle = ((offset + length / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
    const segment = {
      ...d,
      length,
      offset,
      percent: Math.round((d.value / total) * 100),
      tipX: center + radius * Math.cos(midAngle),
      tipY: center + radius * Math.sin(midAngle),
    };
    offset += length;
    return segment;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth={thickness} />
          {segments.map((s, i) => (
            <circle
              key={s.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? thickness + 5 : thickness}
              strokeDasharray={`${Math.max(s.length - 2, 0.5)} ${circumference - Math.max(s.length - 2, 0.5)}`}
              strokeDashoffset={-s.offset}
              transform={`rotate(-90 ${center} ${center})`}
              opacity={active !== null && active !== i ? 0.4 : 1}
              pointerEvents="stroke"
              style={{ transition: 'opacity 0.15s ease, stroke-width 0.15s ease', cursor: 'pointer' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>

        {/* Centred headline figure */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {centerValue ?? total}
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {centerLabel}
          </span>
        </div>

        {active !== null && (
          <ChartTooltip
            x={segments[active].tipX}
            y={segments[active].tipY}
            title={segments[active].label}
            rows={[{
              label: `${segments[active].percent}% of total`,
              color: segments[active].color,
              value: `${segments[active].value}${unit}`,
            }]}
          />
        )}
      </div>

      {/* Legend list — every slice is named and valued, never colour alone */}
      <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {segments.map((s, i) => (
          <div
            key={s.label}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              opacity: active !== null && active !== i ? 0.55 : 1,
              transition: 'opacity 0.15s ease',
              cursor: 'default',
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}{unit}</span>
            <span style={{ color: 'var(--text-tertiary)', width: 38, textAlign: 'right' }}>{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
