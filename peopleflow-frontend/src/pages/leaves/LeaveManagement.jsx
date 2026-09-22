import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hourglass, CheckCircle2, XCircle, Ban, Search, RotateCcw, Eye, Check, X, CalendarDays, UserCheck } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PersonCell } from '../../components/common/Avatar';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { leavesApi } from '../../api/endpoints';
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, ROLE_LABELS, toOptions } from '../../utils/constants';
import { isAdmin } from '../../utils/auth';
import { formatDate, formatDateRange } from '../../utils/format';
import { canReviewLeave, shortText } from './leaveRules';
import { LeaveReviewModal } from './LeaveDialogs';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export function LeaveManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const [review, setReview] = useState(null); // { leave, action }

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey } = useListQuery({
    status: 'pending',
    leaveType: '',
  });

  const { data: leaves, meta, loading, error, reload } = useFetch((config) => leavesApi.list(params, config), [paramsKey, version]);

  const counts = meta?.counts;
  const countsLoading = loading && !counts;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  const hasSearch = Boolean(search || filters.leaveType);

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      lead: true,
      render: (l) => (
        <PersonCell
          name={l.user?.name}
          subtitle={l.user ? `${l.user.email} · ${ROLE_LABELS[l.user.role] || l.user.role}` : undefined}
          avatar={l.user?.avatar?.url}
        />
      ),
    },
    { key: 'leaveType', header: 'Type', render: (l) => <span className="nowrap">{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</span> },
    {
      key: 'dates',
      header: 'Dates',
      render: (l) => (
        <div>
          <div className="nowrap">{formatDateRange(l.startDate, l.endDate)}</div>
          <div className="cell-secondary">Applied {formatDate(l.createdAt)}</div>
        </div>
      ),
    },
    { key: 'days', header: 'Days', render: (l) => <span className="text-bold">{l.days}</span> },
    { key: 'reason', header: 'Reason', render: (l) => <span className="text-muted" title={l.reason}>{shortText(l.reason, 50)}</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} label={LEAVE_STATUS_LABELS[l.status]} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Eye} aria-label="View leave request" onClick={() => navigate(`/leaves/${l._id}`)} />
          {canReviewLeave(l, user) && (
            <>
              <Button variant="ghost" size="sm" className="btn-icon" icon={Check} aria-label="Approve leave" title="Approve" onClick={() => setReview({ leave: l, action: 'approve' })} />
              <Button variant="ghost" size="sm" className="btn-icon" icon={X} aria-label="Reject leave" title="Reject" onClick={() => setReview({ leave: l, action: 'reject' })} />
            </>
          )}
        </div>
      ),
    },
  ];

  const statusLabel = filters.status ? LEAVE_STATUS_LABELS[filters.status].toLowerCase() : '';

  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Review and track leave requests across the organisation">
        {!isAdmin(user) && (
          <Button variant="secondary" icon={UserCheck} onClick={() => navigate('/leaves/my')}>
            My Leaves
          </Button>
        )}
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Pending" value={counts?.pending} icon={Hourglass} subtext="Awaiting review" loading={countsLoading} />
        <StatCard label="Approved" value={counts?.approved} icon={CheckCircle2} subtext={counts ? `of ${total} requests` : undefined} loading={countsLoading} />
        <StatCard label="Rejected" value={counts?.rejected} icon={XCircle} subtext={counts ? `of ${total} requests` : undefined} loading={countsLoading} />
        <StatCard label="Cancelled" value={counts?.cancelled} icon={Ban} subtext="Withdrawn by employees" loading={countsLoading} />
      </div>

      <div className="tab-list" role="tablist" aria-label="Filter by status">
        {TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            role="tab"
            aria-selected={filters.status === tab.value}
            className={`tab-btn ${filters.status === tab.value ? 'active' : ''}`}
            onClick={() => setFilter('status', tab.value)}
          >
            {tab.label}
            {counts && (
              <span className="text-xs text-faint">{tab.value ? counts[tab.value] : total}</span>
            )}
          </button>
        ))}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search by employee name…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leave requests"
            />
          </div>

          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Leave Types"
              options={toOptions(LEAVE_TYPE_LABELS)}
              value={filters.leaveType}
              onChange={(e) => setFilter('leaveType', e.target.value)}
            />
            {hasSearch && (
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setSearch('');
                  setFilter('leaveType', '');
                }}
              >
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
          empty={hasSearch ? {
            icon: Search,
            title: 'No matching leave requests',
            description: 'Try a different name or clear the filters.',
          } : {
            icon: CalendarDays,
            title: statusLabel ? `No ${statusLabel} requests` : 'No leave requests yet',
            description: filters.status === 'pending' ? 'You’re all caught up — new requests will appear here.' : 'Requests will appear here once employees apply.',
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {review && (
        <LeaveReviewModal
          leave={review.leave}
          action={review.action}
          onClose={() => setReview(null)}
          onDone={reload}
        />
      )}
    </div>
  );
}
