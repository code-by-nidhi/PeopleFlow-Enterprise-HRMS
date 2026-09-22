import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, CalendarClock, CalendarPlus, CheckCircle2, Activity, UserPlus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { PersonCell } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DetailItem, Loader, LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useAction } from '../../hooks/useAction';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { tasksApi } from '../../api/endpoints';
import { ROLE_LABELS } from '../../utils/constants';
import { isManagement } from '../../utils/auth';
import { formatDate, formatDateTime, isOverdue, relativeTime } from '../../utils/format';
import { PriorityBadge, TaskStatusBadge, TaskStatusSelect } from './TaskParts';

const daysUntil = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
};

export function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { version } = useNotifications();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: task, loading, error, reload, setData } = useFetch((config) => tasksApi.get(id, config), [id, version]);

  const management = isManagement(user);
  const backTo = management ? '/tasks' : '/tasks/my';

  const [deleteTask, deleting] = useAction(() => tasksApi.remove(id), {
    success: 'Task deleted',
    error: 'Could not delete task',
    onSuccess: () => navigate('/tasks', { replace: true }),
  });

  const back = (
    <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(backTo)}>
      Back
    </Button>
  );

  if (loading && !task) {
    return (
      <div>
        <PageHeader title="Task Details" subtitle="Loading task…">{back}</PageHeader>
        <Loader />
      </div>
    );
  }

  if (error && !task) {
    return (
      <div>
        <PageHeader title="Task Details" subtitle="Task information">{back}</PageHeader>
        <LoadError message={error} onRetry={reload} />
      </div>
    );
  }

  const isAssignee = String(task.assignedTo?._id) === String(user?._id);
  const canChangeStatus = management || isAssignee;
  const overdue = isOverdue(task);
  const remaining = daysUntil(task.deadline);

  let deadlineNote;
  if (task.status === 'completed') deadlineNote = 'Task completed';
  else if (overdue) deadlineNote = `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} overdue`;
  else if (remaining === 0) deadlineNote = 'Due today';
  else deadlineNote = `Due in ${remaining} day${remaining === 1 ? '' : 's'}`;

  return (
    <div>
      <PageHeader title="Task Details" subtitle={`Created ${relativeTime(task.createdAt)} by ${task.assignedBy?.name || 'unknown'}`}>
        {back}
        {management && (
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => navigate(`/tasks/${id}/edit`)}>
              Edit
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      <div className="grid-2">
        <div className="card">
          <div className="stack-sm section-gap">
            <h2 className="card-title">{task.title}</h2>
            <div className="row">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {overdue && <StatusBadge status="overdue" label="Overdue" />}
            </div>
          </div>

          <span className="detail-label">Description</span>
          {task.description ? (
            <p className="text-sm section-gap" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
          ) : (
            <p className="text-sm text-faint section-gap">No description provided.</p>
          )}

          <div className="detail-list">
            <DetailItem icon={CalendarClock} label="Deadline">
              <span className={overdue ? 'text-danger' : undefined}>{formatDate(task.deadline)}</span>
              <span className="text-xs text-muted"> · {deadlineNote}</span>
            </DetailItem>
            <DetailItem icon={CalendarPlus} label="Created">{formatDateTime(task.createdAt)}</DetailItem>
            {task.completedAt && (
              <DetailItem icon={CheckCircle2} label="Completed">{formatDateTime(task.completedAt)}</DetailItem>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-title-row">
              <Activity size={18} />
              <h3 className="card-title">Progress</h3>
            </div>
            {canChangeStatus ? (
              <div className="stack-sm">
                <TaskStatusSelect
                  task={task}
                  label="Status"
                  compact
                  onUpdated={(updated) => setData((prev) => ({ ...prev, ...updated }))}
                />
                <p className="text-xs text-muted">
                  {isAssignee && !management
                    ? 'Keep this up to date — the person who assigned the task is notified when it changes.'
                    : 'Changing the status notifies the assignee.'}
                </p>
              </div>
            ) : (
              <TaskStatusBadge status={task.status} />
            )}
          </div>

          <div className="card">
            <div className="card-title-row">
              <UserPlus size={18} />
              <h3 className="card-title">People</h3>
            </div>
            <div className="stack-sm">
              <div>
                <span className="detail-label">Assigned To</span>
                <PersonCell
                  name={task.assignedTo?.name}
                  avatar={task.assignedTo?.avatar?.url}
                  subtitle={task.assignedTo ? `${task.assignedTo.email} · ${ROLE_LABELS[task.assignedTo.role] || task.assignedTo.role}` : 'Unassigned'}
                />
              </div>
              <div>
                <span className="detail-label">Assigned By</span>
                <PersonCell name={task.assignedBy?.name} subtitle={task.assignedBy?.email} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Task"
        confirmLabel="Delete"
        variant="danger"
        confirmLoading={deleting}
        onConfirm={() => deleteTask()}
      >
        <p>
          Permanently delete <strong>{task.title}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
