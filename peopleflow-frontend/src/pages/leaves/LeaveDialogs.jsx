import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Input';
import { useAction } from '../../hooks/useAction';
import { leavesApi } from '../../api/endpoints';
import { LEAVE_TYPE_LABELS } from '../../utils/constants';
import { formatDateRange } from '../../utils/format';

const Summary = ({ leave }) => (
  <p>
    {leave.user?.name ? <><strong>{leave.user.name}</strong> · </> : null}
    {LEAVE_TYPE_LABELS[leave.leaveType]} · {formatDateRange(leave.startDate, leave.endDate)} ({leave.days} day{leave.days === 1 ? '' : 's'})
  </p>
);

/**
 * Approve / reject confirmation with an optional note. Render it only while a
 * review is in progress (`{review && <LeaveReviewModal … />}`) so the note resets.
 */
export function LeaveReviewModal({ leave, action, onClose, onDone }) {
  const [note, setNote] = useState('');
  const approving = action === 'approve';

  const [submit, submitting] = useAction(
    () => (approving ? leavesApi.approve : leavesApi.reject)(leave._id, note.trim() || undefined),
    {
      success: approving ? 'Leave approved' : 'Leave rejected',
      error: approving ? 'Could not approve leave' : 'Could not reject leave',
      onSuccess: () => {
        onClose();
        onDone?.();
      },
    },
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={approving ? 'Approve Leave Request' : 'Reject Leave Request'}
      confirmLabel={approving ? 'Approve' : 'Reject'}
      variant={approving ? 'success' : 'danger'}
      confirmLoading={submitting}
      onConfirm={() => submit()}
    >
      <div className="stack-sm">
        <Summary leave={leave} />
        {approving && leave.leaveType !== 'unpaid' && (
          <p className="text-sm text-muted">{leave.days} day{leave.days === 1 ? '' : 's'} will be deducted from the applicant’s leave balance.</p>
        )}
        <Textarea
          label={approving ? 'Note (optional)' : 'Reason for rejection (optional)'}
          rows={3}
          maxLength={500}
          placeholder={approving ? 'Add a note for the applicant' : 'Let the applicant know why'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}

export function CancelLeaveModal({ leave, onClose, onDone }) {
  const [cancel, cancelling] = useAction(() => leavesApi.cancel(leave._id), {
    success: 'Leave request cancelled',
    error: 'Could not cancel leave',
    onSuccess: () => {
      onClose();
      onDone?.();
    },
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Cancel Leave Request"
      confirmLabel="Cancel Request"
      cancelLabel="Keep Request"
      variant="danger"
      confirmLoading={cancelling}
      onConfirm={() => cancel()}
    >
      <div className="stack-sm">
        <Summary leave={leave} />
        <p className="text-sm text-muted">
          {leave.status === 'approved' && leave.leaveType !== 'unpaid'
            ? 'This leave is already approved. Cancelling returns the days to your balance.'
            : 'This cannot be undone — you would need to apply again.'}
        </p>
      </div>
    </Modal>
  );
}
