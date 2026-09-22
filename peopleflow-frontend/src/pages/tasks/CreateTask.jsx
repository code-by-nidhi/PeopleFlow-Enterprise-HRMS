import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Save, Plus } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert, Loader, LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { tasksApi, usersApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { ROLE_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, toOptions } from '../../utils/constants';
import { toInputDate } from '../../utils/format';

const EMPTY = {
  title: '',
  description: '',
  assignedTo: '',
  priority: 'medium',
  deadline: '',
  status: 'pending',
};

const taskToForm = (task) => ({
  title: task.title || '',
  description: task.description || '',
  assignedTo: task.assignedTo?._id || '',
  priority: task.priority || 'medium',
  deadline: task.deadline ? toInputDate(task.deadline) : '',
  status: task.status || 'pending',
});

const validate = (form, isEdit) => {
  const errors = {};
  const title = form.title.trim();
  if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  else if (title.length > 150) errors.title = 'Title must be 150 characters or fewer';
  if (form.description.length > 2000) errors.description = 'Description must be 2000 characters or fewer';
  if (!form.assignedTo) errors.assignedTo = 'Select who this task is for';
  if (!form.deadline) errors.deadline = 'Deadline is required';
  else if (!isEdit && form.deadline < toInputDate()) errors.deadline = 'Deadline cannot be in the past';
  return errors;
};

function TaskForm({ initialValues, task, isEdit, onSubmit }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialValues || EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: users, loading: usersLoading, error: usersError, reload: reloadUsers } = useFetch((config) => usersApi.options(undefined, config), []);

  const assigneeOptions = useMemo(() => {
    const options = (users || []).map((u) => ({ value: u._id, label: `${u.name} — ${ROLE_LABELS[u.role] || u.role}` }));
    // Keep the current assignee selectable even if they are no longer active
    const current = task?.assignedTo;
    if (current?._id && !options.some((o) => o.value === current._id)) {
      options.unshift({ value: current._id, label: `${current.name} — ${ROLE_LABELS[current.role] || current.role || 'inactive'}` });
    }
    return options;
  }, [users, task]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, isEdit);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }

    const { status, ...rest } = form;
    const payload = {
      ...rest,
      title: rest.title.trim(),
      description: rest.description.trim(),
      ...(isEdit ? { status } : {}),
    };

    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit(payload);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  let assigneeHint;
  if (usersLoading) assigneeHint = 'Loading people…';
  else if (users && !users.length) assigneeHint = 'No active users available';

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      <Alert type="error">{serverError}</Alert>
      {usersError && (
        <Alert type="warning">
          Could not load the list of people: {usersError}{' '}
          <button type="button" className="link" onClick={reloadUsers}>Try again</button>
        </Alert>
      )}

      <section className="form-section">
        <div className="form-section-head">
          <ClipboardList size={20} />
          <h3 className="form-section-title">Task Details</h3>
        </div>
        <p className="form-section-desc">
          {isEdit ? 'Changes are saved immediately and the assignee is notified.' : 'The assignee gets a notification as soon as the task is created.'}
        </p>

        <Input label="Title" required maxLength={150} placeholder="e.g. Prepare Q3 payroll report" {...bind('title')} />
        <Textarea
          label="Description"
          rows={5}
          maxLength={2000}
          placeholder="Add the context, expected outcome and any links the assignee needs"
          hint={`${form.description.length}/2000`}
          {...bind('description')}
        />

        <div className="form-grid">
          <Select
            label="Assign To"
            required
            placeholder="Select a person"
            options={assigneeOptions}
            hint={assigneeHint}
            {...bind('assignedTo')}
          />
          <Select label="Priority" placeholder={null} options={toOptions(TASK_PRIORITY_LABELS)} {...bind('priority')} />
          <Input label="Deadline" type="date" required min={isEdit ? undefined : toInputDate()} {...bind('deadline')} />
          {isEdit && <Select label="Status" placeholder={null} options={toOptions(TASK_STATUS_LABELS)} {...bind('status')} />}
        </div>
      </section>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" icon={isEdit ? Save : Plus} loading={submitting}>
          {isEdit ? 'Save Changes' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}

export function CreateTask() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: task, loading, error, reload } = useFetch((config) => tasksApi.get(id, config), [id], { enabled: isEdit });

  const handleSubmit = async (payload) => {
    let saved;
    try {
      const res = isEdit ? await tasksApi.update(id, payload) : await tasksApi.create(payload);
      saved = res.data.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
    toast.success(isEdit ? 'Task updated' : 'Task created', saved?.assignedTo?.name ? `Assigned to ${saved.assignedTo.name}` : undefined);
    navigate(`/tasks/${saved?._id || id}`, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Task' : 'Create Task'}
        subtitle={isEdit ? (task ? task.title : 'Update task details') : 'Assign a new piece of work to a team member'}
      >
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(isEdit ? `/tasks/${id}` : '/tasks')}>
          {isEdit ? 'Back to Task' : 'Back to Tasks'}
        </Button>
      </PageHeader>

      {isEdit && loading ? (
        <Loader />
      ) : isEdit && error ? (
        <LoadError message={error} onRetry={reload} />
      ) : isEdit && !task ? (
        <Loader />
      ) : (
        <TaskForm
          key={id || 'new'}
          isEdit={isEdit}
          task={task}
          initialValues={isEdit ? taskToForm(task) : undefined}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
