import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, AlarmClock, Plane, UserX, Search, RotateCcw, UserCheck, CalendarClock, MapPin, ShieldAlert } from 'lucide-react';
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
import { attendanceApi } from '../../api/endpoints';
import { ATTENDANCE_STATUS_LABELS, ROLE_LABELS, VERIFICATION_LABELS, toOptions } from '../../utils/constants';
import { canEditOrganisation, isAdmin } from '../../utils/auth';
import { VerificationBadge } from './VerificationBadge';
import { formatDate, formatHours, formatTime, toInputDate } from '../../utils/format';

export function AttendanceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = toInputDate();

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    date: today,
    status: '',
    verification: '',
  });

  const { data: records, meta, loading, error, reload } = useFetch((config) => attendanceApi.list(params, config), [paramsKey]);

  const summary = meta?.daySummary;
  const summaryLoading = loading && !summary;
  const ofHeadcount = summary ? `of ${summary.headcount} employees` : undefined;
  const isToday = filters.date === today;
  const hasFilters = Boolean(search || filters.status || filters.verification || !isToday);

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      lead: true,
      render: (r) => (
        <PersonCell
          name={r.user?.name}
          subtitle={r.user ? `${r.user.email} · ${ROLE_LABELS[r.user.role] || r.user.role}` : undefined}
          avatar={r.user?.avatar?.url}
        />
      ),
    },
    { key: 'date', header: 'Date', render: (r) => <span className="nowrap">{formatDate(r.date)}</span> },
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
      render: (r) => (r.checkOut ? <span className="nowrap">{formatTime(r.checkOut)}</span> : <span className="text-faint">Still working</span>),
    },
    { key: 'workingHours', header: 'Hours', render: (r) => (r.checkOut ? <span className="nowrap">{formatHours(r.workingHours)}</span> : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={ATTENDANCE_STATUS_LABELS[r.status]} /> },
    { key: 'verification', header: 'Verification', render: (r) => <VerificationBadge proof={r.checkInVerification} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={isToday ? 'Live attendance for today' : `Attendance for ${formatDate(filters.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
      >
        {canEditOrganisation(user) && (
          <>
            <Button variant="secondary" icon={MapPin} onClick={() => navigate('/attendance/offices')}>
              Offices
            </Button>
            <Button variant="secondary" icon={ShieldAlert} onClick={() => navigate('/attendance/audit')}>
              Audit Log
            </Button>
          </>
        )}
        {!isAdmin(user) && (
          <Button variant="secondary" icon={UserCheck} onClick={() => navigate('/attendance/my')}>
            My Attendance
          </Button>
        )}
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Present" value={summary?.present} icon={CalendarCheck} subtext={ofHeadcount} loading={summaryLoading} />
        <StatCard
          label="Late"
          value={summary?.late}
          icon={AlarmClock}
          subtext={summary ? `${summary.halfDay} half day${summary.halfDay === 1 ? '' : 's'}` : undefined}
          loading={summaryLoading}
        />
        <StatCard label="On Leave" value={summary?.onLeave} icon={Plane} subtext={ofHeadcount} loading={summaryLoading} />
        <StatCard label="Absent" value={summary?.absent} icon={UserX} subtext={ofHeadcount} loading={summaryLoading} />
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
              aria-label="Search attendance"
            />
          </div>

          <div className="toolbar-filters">
            <Input
              compact
              type="date"
              max={today}
              value={filters.date}
              onChange={(e) => setFilter('date', e.target.value || today)}
              aria-label="Attendance date"
            />
            <Select
              compact
              placeholder="All Statuses"
              options={toOptions(ATTENDANCE_STATUS_LABELS)}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            />
            <Select
              compact
              placeholder="All Verification"
              options={toOptions(VERIFICATION_LABELS)}
              value={filters.verification}
              onChange={(e) => setFilter('verification', e.target.value)}
            />
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={records || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(r) => r.user?._id && navigate(`/attendance/employee/${r.user._id}`)}
          empty={search || filters.status || filters.verification ? {
            icon: Search,
            title: 'No matching records',
            description: 'Try a different name or clear the filters.',
          } : {
            icon: CalendarClock,
            title: isToday ? 'No check-ins yet today' : 'No attendance on this date',
            description: isToday ? 'Records appear here as employees check in.' : 'Nobody checked in on the selected date.',
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
}
