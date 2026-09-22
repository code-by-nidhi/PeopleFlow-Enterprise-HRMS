import React, { useState } from 'react';
import { useChartWidth } from './useChartWidth';
import { ChartTooltip, ChartLegend } from './ChartTooltip';
import { niceMax, AXIS_TICKS, formatTick } from './scale';

const PAD = { top: 14, right: 12, bottom: 28, left: 38 };
const GAP = 2; // surface gap between adjacent / stacked bars

/** Bar path with only the data-end (top) rounded, anchored to the baseline. */
function barPath(x, y, w, h, radius = 4) {
  const r = Math.min(radius, w / 2, Math.max(h, 0));
  if (h <= 0) return '';
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/**
 * Vertical bar chart — grouped by default, stacked with `stacked`.
 * series: [{ name, color, values: number[] }]
 */
export function BarChart({
  labels = [],
  series = [],
  height = 230,
  stacked = false,
  unit = '',
  legend = true,
}) {
  const [wrapRef, width] = useChartWidth();
  const [active, setActive] = useState(null); // { group, x, y }

  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;

  const groupTotals = labels.map((_, i) =>
    stacked
      ? series.reduce((sum, s) => sum + (s.values[i] || 0), 0)
      : Math.max(...series.map((s) => s.values[i] || 0))
  );
  const max = niceMax(Math.max(...groupTotals, 0));
  const ticks = AXIS_TICKS;

  const groupW = innerW / Math.max(labels.length, 1);
  const barW = Math.max(
    stacked ? Math.min(38, groupW * 0.5) : Math.min(26, (groupW * 0.66) / series.length - GAP),
    4
  );
  const clusterW = stacked ? barW : series.length * (barW + GAP) - GAP;
  const scale = (v) => (v / max) * innerH;
  const baseline = PAD.top + innerH;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
        {/* Recessive grid + y axis labels */}
        {ticks.map((t) => {
          const y = baseline - t * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">
                {formatTick(max * t)}
              </text>
            </g>
          );
        })}

        {labels.map((label, i) => {
          const groupStart = PAD.left + i * groupW + (groupW - clusterW) / 2;
          // topmost visible segment of a stack gets the rounded data-end
          const lastNonZero = series.reduce((acc, s, idx) => ((s.values[i] || 0) > 0 ? idx : acc), -1);
          let stackTop = baseline;

          return (
            <g key={label}>
              {series.map((s, si) => {
                const value = s.values[i] || 0;
                const h = scale(value);
                const x = stacked ? groupStart : groupStart + si * (barW + GAP);
                const isTopSegment = stacked ? si === lastNonZero : true;

                let y;
                if (stacked) {
                  y = stackTop - h;
                  stackTop = y - GAP;
                } else {
                  y = baseline - h;
                }

                return (
                  <path
                    key={s.name}
                    d={barPath(x, y, barW, h, isTopSegment ? 4 : 0)}
                    fill={s.color}
                    opacity={active && active.group !== i ? 0.35 : 1}
                    style={{ transition: 'opacity 0.15s ease' }}
                    onMouseEnter={() =>
                      setActive({ group: i, x: groupStart + clusterW / 2, y: stacked ? baseline - scale(groupTotals[i]) : y })
                    }
                    onMouseLeave={() => setActive(null)}
                  />
                );
              })}

              <text
                x={groupStart + clusterW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight={active && active.group === i ? 700 : 500}
                fill={active && active.group === i ? 'var(--text-primary)' : 'var(--text-tertiary)'}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {active && (
        <ChartTooltip
          x={active.x}
          y={active.y}
          title={labels[active.group]}
          rows={series.map((s) => ({
            label: s.name,
            color: s.color,
            value: `${s.values[active.group] || 0}${unit}`,
          }))}
        />
      )}

      {legend && series.length > 1 && (
        <ChartLegend items={series.map((s) => ({ label: s.name, color: s.color }))} />
      )}
    </div>
  );
}
