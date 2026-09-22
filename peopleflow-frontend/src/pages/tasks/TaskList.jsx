import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, RotateCcw, ListTodo, Timer, CheckCircle2, AlertTriangle, ClipboardList, UserCheck } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { StatCard } from '../../components/common/StatCard';
import { PersonCell } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { useAction } from '../../hooks/useAction';
import { useNotifications } from '../../context/NotificationContext';
import { tasksApi } from '../../api/endpoints';
import { ROLE_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, toOptions } from '../../utils/constants';
import { DeadlineCell, PriorityBadge, TaskStatusBadge, TaskTitleCell } from './TaskParts';
import { SORT_OPTIONS } from './taskOptions';

export function TaskList() {
  const navigate = useNavigate();
  const { version } = useNotifications();
  const [pendingDelete, setPendingDelete] = useState(null);

  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    status: '',
    priority: '',
    overdue: '',
    sort: 'deadline',
  });

  const { data: tasks, meta, loading, error, reload } = useFetch((config) => tasksApi.list(params, config), [paramsKey, version]);

  const [deleteTask, deleting] = useAction((id) => tasksApi.remove(id), {
    success: 'Task deleted',
    error: 'Could not delete task',
    onSuccess: () => {
      setPendingDelete(null);
      reload();
    },
  });

  const counts = meta?.counts;
  const countsLoading = loading && !counts;
  const hasFilters = Boolean(search || filters.status || filters.priority || filters.overdue);

  const columns = [
    { key: 'title', header: 'Task', lead: true, render: (t) => <TaskTitleCell task={t} /> },
    {
      key: 'assignedTo',
      header: 'Assignee',
      render: (t) => (
        <PersonCell
          size={32}
          name={t.assignedTo?.name}
          subtitle={t.assignedTo ? ROLE_LABELS[t.assignedTo.role] || t.assignedTo.role : 'Unassigned'}
          avatar={t.assignedTo?.avatar?.url}
        />
      ),
    },
    { key: 'priority', header: 'Priority', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'deadline', header: 'Deadline', render: (t) => <DeadlineCell task={t} /> },
    { key: 'status', header: 'Status', render: (t) => <TaskStatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" className="btn-icon" icon={Eye} aria-label="View task" onClick={() => navigate(`/tasks/${t._id}`)} />
          <Button variant="ghost" size="sm" className="btn-icon" icon={Pencil} aria-label="Edit task" onClick={() => navigate(`/tasks/${t._id}/edit`)} />
          <Button variant="ghost" size="sm" className="btn-icon" icon={Trash2} aria-label="Delete task" onClick={() => setPendingDelete(t)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Task Management" subtitle="Assign work, set priorities and track progress across the team">
        <Button variant="secondary" icon={UserCheck} onClick={() => navigate('/tasks/my')}>
          My Tasks
        </Button>
        <Button icon={Plus} onClick={() => navigate('/tasks/create')}>
          Create Task
        </Button>
      </PageHeader>

      <div className="stats-grid">
        <StatCard label="Pending" value={counts?.pending} icon={ListTodo} subtext="Not started" loading={countsLoading} />
        <StatCard label="In Progress" value={counts?.['in-progress']} icon={Timer} subtext="Being worked on" loading={countsLoading} />
        <StatCard label="Completed" value={counts?.completed} icon={CheckCircle2} subtext="Done" loading={countsLoading} />
        <StatCard label="Overdue" value={counts?.overdue} icon={AlertTriangle} subtext="Past deadline, not completed" loading={countsLoading} />
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search tasks by title…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search tasks"
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
            title: 'No tasks yet',
            description: 'Create a task and assign it to a team member.',
            actionLabel: 'Create Task',
            actionIcon: Plus,
            onAction: () => navigate('/tasks/create'),
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete Task"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteTask(pendingDelete._id)}
      >
        <p>
          Permanently delete <strong>{pendingDelete?.title}</strong>
          {pendingDelete?.assignedTo?.name ? <> assigned to <strong>{pendingDelete.assignedTo.name}</strong></> : null}? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
