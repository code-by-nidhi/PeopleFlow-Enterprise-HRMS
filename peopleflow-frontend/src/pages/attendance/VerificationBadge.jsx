import React from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ATTENDANCE_REASON_LABELS, VERIFICATION_LABELS } from '../../utils/constants';

/**
 * How a check-in was proven. Employees only receive the method, so a flagged
 * record shows to them as verified; admin/HR/managers see the full status.
 */
function verificationStatus(proof) {
  if (!proof) return null;
  if (proof.status) return proof.status;
  if (proof.method === 'manual') return 'manual';
  return proof.method ? 'verified' : null;
}

export function VerificationBadge({ proof }) {
  const status = verificationStatus(proof);
  if (!status) return <span className="text-faint" title="Recorded before verified attendance was enabled">—</span>;
  const title = proof.flags?.length ? proof.flags.map((f) => ATTENDANCE_REASON_LABELS[f] || f).join('\n') : undefined;
  return (
    <span title={title}>
      <StatusBadge status={status} label={VERIFICATION_LABELS[status]} />
    </span>
  );
}
