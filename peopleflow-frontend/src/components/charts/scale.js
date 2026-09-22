/**
 * Rounds the axis maximum up so the 4 gridline intervals land on clean,
 * distinct values (never "0, 0, 1, 1, 1" for small or all-zero data).
 */
export function niceMax(value, minimum = 4) {
  const rawStep = Math.max(value, minimum) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].find((s) => rawStep / magnitude <= s) * magnitude;
  return step * 4;
}

export const AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];

export function formatTick(value) {
  return Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(1);
}
