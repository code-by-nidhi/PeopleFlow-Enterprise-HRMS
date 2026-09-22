import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, ListTodo, Timer, CheckCircle2, AlertTriangle, ClipboardList, Users } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { tasksApi } from '../../api/endpoints';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, toOptions } from '../../utils/constants';
import { isManagement } from '../../utils/auth';
import { DeadlineCell, PriorityBadge, TaskStatusSelect, TaskTitleCell } from './TaskParts';
import { SORT_OPTIONS } from './taskOptions';

export function MyTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    status: '',
    priority: '',
    overdue: '',
    sort: 'deadline',
  });

  const { data: tasks, meta, loading, error, reload, setData } = useFetch(
    (config) => tasksApi.me(params, config),
    [paramsKey, version],
  );

  const counts = meta?.counts;
  const countsLoading = loading && !counts;
  const hasFilters = Boolean(search || filters.status || filters.priority || filters.overdue);

  const handleUpdated = (updated) => {
    // Show the new status right away, then refetch so counts and filters stay correct
    setData((rows) => (rows || []).map((t) => (t._id === updated._id ? { ...t, ...updated } : t)));
    reload();
  };

  const columns = [
    { key: 'title', header: 'Task', lead: true, render: (t) => <TaskTitleCell task={t} /> },
    { key: 'assignedBy', header: 'Assigned By', render: (t) => <span className="nowrap">{t.assignedBy?.name || '—'}</span> },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'deadline', header: 'Deadline', render: (t) => <DeadlineCell task={t} /> },
    { key: 'status', header: 'Status', render: (t) => <TaskStatusSelect task={t} onUpdated={handleUpdated} /> },
  ];

  return (
    <div>
      <PageHeader title="My Tasks" subtitle="Everything assigned to you — update progress as you go">
        {isManagement(user) && (
          <Button variant="secondary" icon={Users} onClick={() => navigate('/tasks')}>
            All Tasks
          </Button>
        )}
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Pending" value={counts?.pending} icon={ListTodo} subtext="Not started yet" loading={countsLoading} />
        <StatCard label="In Progress" value={counts?.['in-progress']} icon={Timer} subtext="Currently working on" loading={countsLoading} />
        <StatCard label="Completed" value={counts?.completed} icon={CheckCircle2} subtext="Nice work" loading={countsLoading} />
        <StatCard label="Overdue" value={counts?.overdue} icon={AlertTriangle} subtext="Past the deadline" loading={countsLoading} />
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search my tasks…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search my tasks"
            />
          </div>

          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All Statuses"
              options={toOptions(TASK_STATUS_LABELS)}
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            />
            <Select
              compact
              placeholder="All Priorities"
              options={toOptions(TASK_PRIORITY_LABELS)}
              value={filters.priority}
              onChange={(e) => setFilter('priority', e.target.value)}
            />
            <Select
              compact
              placeholder={null}
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value)}
              aria-label="Sort tasks"
            />
            <Button
              variant={filters.overdue ? 'danger' : 'secondary'}
              size="sm"
              icon={AlertTriangle}
              aria-pressed={Boolean(filters.overdue)}
              onClick={() => setFilter('overdue', filters.overdue ? '' : 'true')}
            >
              Overdue only
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={tasks || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={(t) => navigate(`/tasks/${t._id}`)}
          empty={hasFilters ? {
            icon: Search,
            title: 'No matching tasks',
            description: 'Try a different search term or clear the filters.',
          } : {
            icon: ClipboardList,
            title: 'No tasks assigned to you',
            description: 'New assignments will appear here as soon as they are created.',
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>
    </div>
  );
}
