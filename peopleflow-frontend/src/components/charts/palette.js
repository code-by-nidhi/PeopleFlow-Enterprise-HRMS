/**
 * Chart colours resolve to CSS variables so they switch with the theme.
 * Categorical slots are assigned in this fixed order and never cycled;
 * a 7th+ category folds into "Other". Status colours are reserved for state.
 */
export const CATEGORICAL = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
];

export const OTHER_COLOR = 'var(--series-other)';

export const STATUS_COLORS = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
};

/**
 * Maps [{ label, value }] to donut/legend data with stable slot colours,
 * folding everything past the palette size into a single "Other" slice.
 */
export function withCategoricalColors(items, max = CATEGORICAL.length) {
  if (items.length <= max) {
    return items.map((item, i) => ({ ...item, color: CATEGORICAL[i] }));
  }
  const head = items.slice(0, max - 1).map((item, i) => ({ ...item, color: CATEGORICAL[i] }));
  const otherValue = items.slice(max - 1).reduce((sum, item) => sum + item.value, 0);
  return [...head, { label: 'Other', value: otherValue, color: OTHER_COLOR }];
}
