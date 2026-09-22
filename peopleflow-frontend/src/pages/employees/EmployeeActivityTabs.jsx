import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck2, Clock, Timer, AlertTriangle, CalendarDays, CheckSquare, ExternalLink } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useFetch } from '../../hooks/useFetch';
import { attendanceApi, leavesApi, tasksApi } from '../../api/endpoints';
import { ATTENDANCE_STATUS_LABELS, LEAVE_TYPE_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatDateRange, formatHours, formatTime, isOverdue } from '../../utils/format';

const PAGE_SIZE = 10;

function SectionToolbar({ title, subtitle, children }) {
  return (
    <div className="table-toolbar">
      <div>
        <h3 className="card-title">{title}</h3>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/** Attendance history with this month's summary for one employee. */
export function AttendanceTab({ employeeId }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: records, meta, loading, error, reload } = useFetch(
    (config) => attendanceApi.forEmployee(employeeId, { page, limit: PAGE_SIZE }, config),
    [employeeId, page],
  );

  const summary = meta?.monthSummary;
  const statsLoading = loading && !meta;

  const columns = [
    {
      key: 'date',
      header: 'Date',
      lead: true,
      render: (a) => <span className="nowrap">{formatDate(a.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>,
    },
    { key: 'checkIn', header: 'Check In', render: (a) => <span className="nowrap">{formatTime(a.checkIn)}</span> },
    { key: 'checkOut', header: 'Check Out', render: (a) => <span className="nowrap">{a.checkOut ? formatTime(a.checkOut) : '—'}</span> },
    { key: 'workingHours', header: 'Hours', render: (a) => (a.checkOut ? formatHours(a.workingHours) : '—') },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} label={ATTENDANCE_STATUS_LABELS[a.status]} /> },
  ];

  return (
    <div>
      <div className="stats-grid">
        <StatCard
          label="Days Attended"
          value={summary?.daysAttended}
          icon={CalendarCheck2}
          subtext={summary ? `${summary.present} on time this month` : 'This month'}
          loading={statsLoading}
        />
        <StatCard label="Late Arrivals" value={summary?.late} icon={AlertTriangle} subtext="This month" loading={statsLoading} />
        <StatCard label="Half Days" value={summary?.['half-day']} icon={Clock} subtext="This month" loading={statsLoading} />
        <StatCard
          label="Hours Worked"
          value={summary ? formatHours(summary.totalHours) : undefined}
          icon={Timer}
          subtext="This month"
          loading={statsLoading}
        />
      </div>

      <div className="table-container">
        <SectionToolbar title="Attendance History" subtitle="Most recent first">
          <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => navigate(`/attendance/employee/${employeeId}`)}>
            Full Log
          </Button>
        </SectionToolbar>
        <DataTable
          columns={columns}
          rows={records || []}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={{ icon: CalendarCheck2, title: 'No attendance records', description: 'Check-ins will appear here once the employee starts marking attendance.' }}
        />
        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
}

/** Leave requests raised by one employee (by their user id). */
export function LeavesTab({ userId }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: leaves, meta, loading, error, reload } = useFetch(
    (config) => leavesApi.list({ userId, page, limit: PAGE_SIZE }, config),
    [userId, page],
    { enabled: Boolean(userId) },
  );

  const columns = [
    { key: 'leaveType', header: 'Type', lead: true, render: (l) => LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType },
    { key: 'dates', header: 'Dates', render: (l) => <span className="nowrap">{formatDateRange(l.startDate, l.endDate)}</span> },
    { key: 'days', header: 'Days', render: (l) => l.days ?? '—' },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    { key: 'createdAt', header: 'Applied', render: (l) => <span className="nowrap">{formatDate(l.createdAt)}</span> },
  ];

  return (
    <div className="table-container">
      <SectionToolbar title="Leave History" subtitle="All leave requests from this employee" />
      <DataTable
        columns={columns}
        rows={leaves || []}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(l) => navigate(`/leaves/${l._id}`)}
        empty={{ icon: CalendarDays, title: 'No leave requests', description: 'This employee has not applied for any leave yet.' }}
      />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}

/** Tasks assigned to one employee (by their user id). */
export function TasksTab({ userId }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data: tasks, meta, loading, error, reload } = useFetch(
    (config) => tasksApi.list({ assignedTo: userId, page, limit: PAGE_SIZE }, config),
    [userId, page],
    { enabled: Boolean(userId) },
  );

  const columns = [
    { key: 'title', header: 'Task', lead: true, render: (t) => <span className="cell-primary">{t.title}</span> },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge status={t.priority} label={TASK_PRIORITY_LABELS[t.priority]} /> },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <div className="row" style={{ gap: '0.35rem' }}>
          <StatusBadge status={t.status} label={TASK_STATUS_LABELS[t.status]} />
          {isOverdue(t) && <StatusBadge status="overdue" />}
        </div>
      ),
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (t) => <span className={`nowrap ${isOverdue(t) ? 'text-danger' : ''}`}>{formatDate(t.deadline)}</span>,
    },
    { key: 'assignedBy', header: 'Assigned By', render: (t) => t.assignedBy?.name || '—' },
  ];

  return (
    <div className="table-container">
      <SectionToolbar title="Assigned Tasks" subtitle="Tasks assigned to this employee" />
      <DataTable
        columns={columns}
        rows={tasks || []}
        loading={loading}
        error={error}
        onRetry={reload}
        onRowClick={(t) => navigate(`/tasks/${t._id}`)}
        empty={{ icon: CheckSquare, title: 'No tasks assigned', description: 'Tasks assigned to this employee will appear here.' }}
      />
      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}
