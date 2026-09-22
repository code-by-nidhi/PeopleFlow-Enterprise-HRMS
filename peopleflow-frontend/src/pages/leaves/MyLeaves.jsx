import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Coffee, Stethoscope, Award, FileText, Eye, XCircle, CalendarDays, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { leavesApi } from '../../api/endpoints';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, toOptions } from '../../utils/constants';
import { formatDate, formatDateRange } from '../../utils/format';
import { canCancelLeave, shortText } from './leaveRules';
import { CancelLeaveModal } from './LeaveDialogs';
import { LeaveApplyForm } from './LeaveApplyForm';

export function MyLeaves() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(null);

  const { filters, setFilter, setPage, params, paramsKey, resetFilters } = useListQuery({ status: '' });
  const { data: leaves, meta, loading, error, reload } = useFetch((config) => leavesApi.me(params, config), [paramsKey, version]);

  const balance = meta?.balance;
  const counts = meta?.counts;
  const statsLoading = loading && !meta;
  const totalApplications = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;

  const columns = [
    {
      key: 'leaveType',
      header: 'Leave',
      lead: true,
      render: (l) => (
        <div>
          <div className="cell-primary nowrap">{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</div>
          <div className="cell-secondary" title={l.reason}>{shortText(l.reason, 45)}</div>
        </div>
      ),
    },
    { key: 'dates', header: 'Dates', render: (l) => <span className="nowrap">{formatDateRange(l.startDate, l.endDate)}</span> },
    { key: 'days', header: 'Days', render: (l) => <span className="text-bold">{l.days}</span> },
    { key: 'createdAt', header: 'Applied On', render: (l) => <span className="nowrap">{formatDate(l.createdAt)}</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} label={LEAVE_STATUS_LABELS[l.status]} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Eye} aria-label="View leave request" onClick={() => navigate(`/leaves/${l._id}`)} />
          {canCancelLeave(l, user) && (
            <Button variant="ghost" size="sm" className="btn-icon" icon={XCircle} aria-label="Cancel leave request" title="Cancel request" onClick={() => setPendingCancel(l)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="My Leaves" subtitle="Check your balance, apply for time off and track your requests">
        <Button
          variant={showForm ? 'secondary' : 'primary'}
          icon={showForm ? X : CalendarPlus}
          onClick={() => setShowForm((open) => !open)}
          aria-expanded={showForm}
        >
          {showForm ? 'Close Form' : 'Apply for Leave'}
        </Button>
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Casual Leave" value={balance?.casual} icon={Coffee} subtext="Days available" loading={statsLoading} />
        <StatCard label="Sick Leave" value={balance?.sick} icon={Stethoscope} subtext="Days available" loading={statsLoading} />
        <StatCard label="Earned Leave" value={balance?.earned} icon={Award} subtext="Days available" loading={statsLoading} />
        <StatCard
          label="Applications"
          value={totalApplications}
          icon={FileText}
          subtext={counts ? `${counts.pending} pending · ${counts.approved} approved` : undefined}
          loading={statsLoading}
        />
      </div>

      {showForm && (
        <LeaveApplyForm
          balance={balance}
          onCancel={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <h3 className="card-title">Leave History</h3>
            <span className="card-subtitle">All requests you have submitted</span>
          </div>
          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Statuses"
              options={toOptions(LEAVE_STATUS_LABELS)}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            />
            {filters.status && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={leaves || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(l) => navigate(`/leaves/${l._id}`)}
          empty={filters.status ? {
            icon: CalendarDays,
            title: `No ${LEAVE_STATUS_LABELS[filters.status].toLowerCase()} requests`,
            description: 'Try another status filter.',
          } : {
            icon: CalendarDays,
            title: 'No leave requests yet',
            description: 'When you apply for leave it will show up here.',
            actionLabel: showForm ? undefined : 'Apply for Leave',
            actionIcon: CalendarPlus,
            onAction: () => setShowForm(true),
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {pendingCancel && (
        <CancelLeaveModal leave={pendingCancel} onClose={() => setPendingCancel(null)} onDone={reload} />
      )}
    </div>
  );
}
