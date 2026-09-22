import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, X, XCircle, IdCard, Building2, Briefcase, Tag, CalendarRange, Hourglass, CalendarPlus,
  UserCheck, Clock, MessageSquare, Wallet,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { PersonCell } from '../../components/common/Avatar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Alert, DetailItem, Loader, LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { leavesApi } from '../../api/endpoints';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, ROLE_LABELS } from '../../utils/constants';
import { isManagement } from '../../utils/auth';
import { formatDate, formatDateRange, formatDateTime } from '../../utils/format';
import { PAID_LEAVE_TYPES, canCancelLeave, canReviewLeave, isOwnLeave } from './leaveRules';
import { CancelLeaveModal, LeaveReviewModal } from './LeaveDialogs';

const BALANCE_ROWS = [
  { key: 'casual', label: 'Casual Leave' },
  { key: 'sick', label: 'Sick Leave' },
  { key: 'earned', label: 'Earned Leave' },
];

export function LeaveDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const [review, setReview] = useState(null); // 'approve' | 'reject'
  const [cancelling, setCancelling] = useState(false);

  const { data: leave, loading, error, reload } = useFetch((config) => leavesApi.get(id, config), [id, version]);

  const backTo = isManagement(user) ? '/leaves' : '/leaves/my';
  const back = (
    <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(backTo)}>
      Back
    </Button>
  );

  if (loading && !leave) {
    return (
      <div>
        <PageHeader title="Leave Request" subtitle="Loading request details…">{back}</PageHeader>
        <Loader />
      </div>
    );
  }

  if (error && !leave) {
    return (
      <div>
        <PageHeader title="Leave Request" subtitle="Request details">{back}</PageHeader>
        <LoadError message={error} onRetry={reload} />
      </div>
    );
  }

  const own = isOwnLeave(leave, user);
  const canReview = canReviewLeave(leave, user);
  const canCancel = canCancelLeave(leave, user);
  const isPaid = PAID_LEAVE_TYPES.includes(leave.leaveType);
  const typeLabel = LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType;
  const available = isPaid ? leave.balance?.[leave.leaveType] ?? 0 : null;
  const reviewed = leave.status === 'approved' || leave.status === 'rejected';

  return (
    <div>
      <PageHeader title="Leave Request" subtitle={`${typeLabel} · ${formatDateRange(leave.startDate, leave.endDate)}`}>
        {back}
        {canCancel && (
          <Button variant="danger" icon={XCircle} onClick={() => setCancelling(true)}>
            Cancel Request
          </Button>
        )}
        {canReview && (
          <>
            <Button variant="danger" icon={X} onClick={() => setReview('reject')}>
              Reject
            </Button>
            <Button variant="success" icon={Check} onClick={() => setReview('approve')}>
              Approve
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <PersonCell
                size={48}
                name={leave.user?.name}
                avatar={leave.user?.avatar?.url}
                subtitle={leave.user ? `${leave.user.email} · ${ROLE_LABELS[leave.user.role] || leave.user.role}` : undefined}
              />
              <StatusBadge status={leave.status} label={LEAVE_STATUS_LABELS[leave.status]} />
            </div>

            <div className="detail-list section-gap">
              <DetailItem icon={IdCard} label="Employee ID">{leave.employee?.employeeId}</DetailItem>
              <DetailItem icon={Building2} label="Department">{leave.employee?.department?.name}</DetailItem>
              <DetailItem icon={Briefcase} label="Designation">{leave.employee?.designation?.title}</DetailItem>
              <DetailItem icon={Tag} label="Leave Type">{typeLabel}</DetailItem>
              <DetailItem icon={CalendarRange} label="Dates">{formatDateRange(leave.startDate, leave.endDate)}</DetailItem>
              <DetailItem icon={Hourglass} label="Duration">{`${leave.days} working day${leave.days === 1 ? '' : 's'}`}</DetailItem>
              <DetailItem icon={CalendarPlus} label="Applied On">{formatDateTime(leave.createdAt)}</DetailItem>
            </div>

            <span className="detail-label">Reason</span>
            <p className="text-sm">{leave.reason}</p>
          </div>

          {reviewed && (
            <div className="card">
              <div className="card-title-row">
                <UserCheck size={18} />
                <h3 className="card-title">Review</h3>
              </div>
              <div className="detail-list">
                <DetailItem icon={UserCheck} label={leave.status === 'approved' ? 'Approved By' : 'Rejected By'}>{leave.reviewedBy?.name}</DetailItem>
                <DetailItem icon={Clock} label="Reviewed At">{formatDateTime(leave.reviewedAt)}</DetailItem>
                <DetailItem icon={MessageSquare} label="Note">{leave.reviewNote || 'No note added'}</DetailItem>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title-row">
            <Wallet size={18} />
            <h3 className="card-title">{own ? 'Your Leave Balance' : `${leave.user?.name || 'Applicant'}’s Leave Balance`}</h3>
          </div>

          <div className="stack-sm section-gap">
            {BALANCE_ROWS.map((row) => (
              <div key={row.key} className="list-item">
                <div className="list-item-body">
                  <span className="list-item-title">{row.label}</span>
                  {row.key === leave.leaveType && <span className="list-item-meta">Type used by this request</span>}
                </div>
                <span className="text-bold">{leave.balance?.[row.key] ?? 0} days</span>
              </div>
            ))}
          </div>

          {leave.status === 'pending' && isPaid && (
            available >= leave.days ? (
              <Alert type="info">
                Approving deducts {leave.days} day{leave.days === 1 ? '' : 's'}, leaving {available - leave.days} day{available - leave.days === 1 ? '' : 's'} of {typeLabel.toLowerCase()}.
              </Alert>
            ) : (
              <Alert type="warning">
                Only {available} day{available === 1 ? '' : 's'} of {typeLabel.toLowerCase()} available — this request needs {leave.days}.
              </Alert>
            )
          )}
          {!isPaid && <p className="text-sm text-muted">Unpaid leave does not use the leave balance.</p>}
          {leave.status === 'pending' && own && !canReview && (
            <p className="text-sm text-muted">Your request is waiting for review. You will be notified once it is approved or rejected.</p>
          )}
          {leave.status === 'approved' && own && !canCancel && (
            <p className="text-sm text-muted">This leave has already started, so it can no longer be cancelled.</p>
          )}
          {leave.status === 'cancelled' && (
            <p className="text-sm text-muted">This request was cancelled{leave.updatedAt ? ` on ${formatDate(leave.updatedAt)}` : ''}.</p>
          )}
        </div>
      </div>

      {review && (
        <LeaveReviewModal leave={leave} action={review} onClose={() => setReview(null)} onDone={reload} />
      )}
      {cancelling && (
        <CancelLeaveModal leave={leave} onClose={() => setCancelling(false)} onDone={reload} />
      )}
    </div>
  );
}
