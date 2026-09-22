import React from 'react';
import { CalendarClock, PencilLine, RotateCcw, Search } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ATTENDANCE_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatHours, formatTime, toInputDate } from '../../utils/format';
import { VerificationBadge } from './VerificationBadge';

const columns = [
  {
    key: 'date',
    header: 'Date',
    lead: true,
    render: (r) => (
      <div>
        <div className="cell-primary nowrap">{formatDate(r.date)}</div>
        <div className="cell-secondary">{formatDate(r.date, { weekday: 'long' })}</div>
      </div>
    ),
  },
  {
    key: 'checkIn',
    header: 'Check In',
    render: (r) => (
      <div>
        <div className="nowrap">{formatTime(r.checkIn)}</div>
        {r.office?.name && <div className="cell-secondary">{r.office.name}</div>}
      </div>
    ),
  },
  {
    key: 'checkOut',
    header: 'Check Out',
    render: (r) => (r.checkOut ? <span className="nowrap">{formatTime(r.checkOut)}</span> : <span className="text-faint">Not checked out</span>),
  },
  { key: 'workingHours', header: 'Hours', render: (r) => (r.checkOut ? <span className="nowrap">{formatHours(r.workingHours)}</span> : '—') },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={ATTENDANCE_STATUS_LABELS[r.status]} /> },
  { key: 'verification', header: 'Verification', render: (r) => <VerificationBadge proof={r.checkInVerification} /> },
];

/** Date-range filtered attendance history table (my attendance / one employee). */
export function AttendanceHistory({ title, records, meta, loading, error, onRetry, filters, setFilter, resetFilters, setPage, onCorrect, actions }) {
  const today = toInputDate();
  const hasFilters = Boolean(filters.from || filters.to);

  const tableColumns = onCorrect ? [
    ...columns,
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" icon={PencilLine} onClick={() => onCorrect(r)}>
          Correct
        </Button>
      ),
    },
  ] : columns;

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <div>
          <h3 className="card-title">{title}</h3>
          <span className="card-subtitle">Most recent days first</span>
        </div>
        <div className="toolbar-filters">
          <Input
            compact
            type="date"
            label="From"
            max={filters.to || today}
            value={filters.from}
            onChange={(e) => setFilter('from', e.target.value)}
          />
          <Input
            compact
            type="date"
            label="To"
            min={filters.from || undefined}
            max={today}
            value={filters.to}
            onChange={(e) => setFilter('to', e.target.value)}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
              Reset
            </Button>
          )}
          {actions}
        </div>
      </div>

      <DataTable
        columns={tableColumns}
        rows={records || []}
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={hasFilters ? {
          icon: Search,
          title: 'No attendance in this range',
          description: 'Try a different date range or clear the filters.',
        } : {
          icon: CalendarClock,
          title: 'No attendance records yet',
          description: 'Check-ins will appear here day by day.',
        }}
      />

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
