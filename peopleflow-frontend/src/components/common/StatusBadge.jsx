import React from 'react';
import { STATUS_TONES } from '../../utils/constants';
import { labelize } from '../../utils/format';

/** <StatusBadge status="in-progress" /> → amber "In Progress" pill */
export function StatusBadge({ status = '', label, tone }) {
  const resolvedTone = tone || STATUS_TONES[status] || 'neutral';
  return (
    <span className={`badge badge-${resolvedTone}`}>
      <span className="badge-dot" />
      {label || labelize(status)}
    </span>
  );
}
