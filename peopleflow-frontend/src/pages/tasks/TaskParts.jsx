import React, { useState } from 'react';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAction } from '../../hooks/useAction';
import { tasksApi } from '../../api/endpoints';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, toOptions } from '../../utils/constants';
import { formatDate, isOverdue } from '../../utils/format';

const STATUS_OPTIONS = toOptions(TASK_STATUS_LABELS);

const preview = (text = '', max = 70) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

/** Title with a one-line description preview. */
export function TaskTitleCell({ task }) {
  return (
    <div>
      <div className="cell-primary">{task.title}</div>
      {task.description && <div className="cell-secondary" title={task.description}>{preview(task.description)}</div>}
    </div>
  );
}

export function PriorityBadge({ priority }) {
  return <StatusBadge status={priority} label={`${TASK_PRIORITY_LABELS[priority] || priority} Priority`} />;
}

export function TaskStatusBadge({ status }) {
  return <StatusBadge status={status} label={TASK_STATUS_LABELS[status]} />;
}

/** Deadline date, flagged when the task is overdue. */
export function DeadlineCell({ task }) {
  const overdue = isOverdue(task);
  return (
    <div className="row">
      <span className={`nowrap ${overdue ? 'text-danger text-bold' : ''}`}>{formatDate(task.deadline)}</span>
      {overdue && <StatusBadge status="overdue" label="Overdue" />}
    </div>
  );
}

/**
 * Status dropdown that saves immediately. Shows the chosen value while saving
 * and calls `onUpdated(updatedTask)` once the server confirms.
 */
export function TaskStatusSelect({ task, onUpdated, label, compact = true }) {
  const [pendingStatus, setPendingStatus] = useState(null);

  const [update, updating] = useAction((status) => tasksApi.update(task._id, { status }), {
    success: (res) => `Task marked as ${TASK_STATUS_LABELS[res.data.data.status].toLowerCase()}`,
    error: 'Could not update task status',
    onSuccess: (res) => onUpdated?.(res.data.data),
  });

  const handleChange = async (e) => {
    const next = e.target.value;
    if (next === task.status) return;
    setPendingStatus(next);
    await update(next);
    setPendingStatus(null);
  };

  return (
    <Select
      compact={compact}
      label={label}
      placeholder={null}
      options={STATUS_OPTIONS}
      value={pendingStatus || task.status}
      disabled={updating}
      onChange={handleChange}
      aria-label={label ? undefined : `Status of ${task.title}`}
    />
  );
}
