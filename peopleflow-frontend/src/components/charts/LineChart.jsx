import React, { useId, useRef, useState } from 'react';
import { useChartWidth } from './useChartWidth';
import { ChartTooltip, ChartLegend } from './ChartTooltip';
import { niceMax, AXIS_TICKS, formatTick } from './scale';

const PAD = { top: 14, right: 16, bottom: 28, left: 38 };

/**
 * Line / area chart.
 * series: [{ name, color, values: number[] }]
 */
export function LineChart({
  labels = [],
  series = [],
  height = 230,
  area = false,
  unit = '',
  legend = true,
}) {
  const [wrapRef, width] = useChartWidth();
  const svgRef = useRef(null);
  const gradientId = `grad${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [active, setActive] = useState(null);

  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0));
  const ticks = AXIS_TICKS;

  const xAt = (i) => PAD.left + (labels.length < 2 ? innerW / 2 : (i * innerW) / (labels.length - 1));
  const yAt = (v) => PAD.top + innerH - (v / max) * innerH;

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = (x - PAD.left) / innerW;
    const index = Math.round(ratio * (labels.length - 1));
    setActive(Math.min(Math.max(index, 0), labels.length - 1));
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={() => setActive(null)}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0]?.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={series[0]?.color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid + y axis labels */}
        {ticks.map((t) => {
          const y = PAD.top + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">
                {formatTick(max * t)}
              </text>
            </g>
          );
        })}

        {/* Crosshair */}
        {active !== null && (
          <line
            x1={xAt(active)}
            y1={PAD.top}
            x2={xAt(active)}
            y2={PAD.top + innerH}
            stroke="var(--border-dark)"
            strokeWidth="1"
          />
        )}

        {/* Series */}
        {series.map((s, si) => {
          const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
          return (
            <g key={s.name}>
              {area && si === 0 && (
                <polygon
                  points={`${PAD.left},${PAD.top + innerH} ${points} ${PAD.left + innerW},${PAD.top + innerH}`}
                  fill={`url(#${gradientId})`}
                />
              )}
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.values.map((v, i) => (
                <circle
                  key={labels[i]}
                  cx={xAt(i)}
                  cy={yAt(v)}
                  r={active === i ? 5 : 4}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })}

        {/* X axis labels */}
        {labels.map((label, i) => (
          <text
            key={label}
            x={xAt(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight={active === i ? 700 : 500}
            fill={active === i ? 'var(--text-primary)' : 'var(--text-tertiary)'}
          >
            {label}
          </text>
        ))}
      </svg>

      {active !== null && (
        <ChartTooltip
          x={xAt(active)}
          y={Math.min(...series.map((s) => yAt(s.values[active])))}
          title={labels[active]}
          rows={series.map((s) => ({
            label: s.name,
            color: s.color,
            value: `${s.values[active]}${unit}`,
          }))}
        />
      )}

      {legend && series.length > 1 && (
        <ChartLegend items={series.map((s) => ({ label: s.name, color: s.color }))} />
      )}
    </div>
  );
}
