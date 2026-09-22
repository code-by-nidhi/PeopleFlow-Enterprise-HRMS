import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Building2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { usersApi } from '../../api/endpoints';
import { ROLE_LABELS } from '../../utils/constants';

const EMPTY = { name: '', description: '', head: '', isActive: 'true' };

const DEPARTMENT_NAME_REGEX = /^[A-Za-z& ]{2,50}$/;

/** Converts an API department into form state. */
function toForm(department) {
  return {
    name: department.name || '',
    description: department.description || '',
    head: department.head?._id || '',
    isActive: department.isActive === false ? 'false' : 'true',
  };
}

const validate = (form) => {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Department name is required';
  else if (!DEPARTMENT_NAME_REGEX.test(form.name.trim())) errors.name = 'Use 2-50 letters, spaces or &';
  if (form.description.length > 500) errors.description = 'Description must be under 500 characters';
  return errors;
};

/**
 * Shared create/edit form; edit mode when `department` (the API object) is passed.
 * `onSubmit(payload)` must return a promise and throw an Error with a readable message on failure.
 */
export function DepartmentForm({ department, onSubmit, submitLabel }) {
  const navigate = useNavigate();
  const isEdit = Boolean(department);
  const currentHead = department?.head;
  const [form, setForm] = useState(() => (department ? toForm(department) : EMPTY));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: users, loading: usersLoading, error: usersError } = useFetch(
    (config) => usersApi.options('admin,hr,manager', config),
    [],
  );

  // Keep the current head selectable even if their account is no longer active
  const headOptions = useMemo(() => {
    const options = (users || []).map((u) => ({ value: u._id, label: `${u.name} (${ROLE_LABELS[u.role] || u.role})` }));
    if (currentHead && !options.some((o) => o.value === currentHead._id)) {
      options.unshift({ value: currentHead._id, label: currentHead.name });
    }
    return options;
  }, [users, currentHead]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      name: form.name.trim().replace(/\s+/g, ' '),
      description: form.description.trim(),
      head: form.head,
      ...(isEdit ? { isActive: form.isActive === 'true' } : {}),
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

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      <Alert type="error">{serverError}</Alert>

      <section className="form-section">
        <div className="form-section-head">
          <Building2 size={20} />
          <h3 className="form-section-title">Department Details</h3>
        </div>
        <p className="form-section-desc">Name, purpose and the person responsible for this department</p>

        <div className="form-grid">
          <Input label="Department Name" placeholder="e.g. Research & Development" required maxLength={50} {...bind('name')} />
          <Select
            label="Department Head"
            placeholder={usersLoading ? 'Loading…' : 'No head assigned'}
            options={headOptions}
            hint={usersError ? 'Could not load users' : 'Admins, HR and managers can lead a department'}
            {...bind('head')}
          />
          {isEdit && (
            <Select
              label="Status"
              placeholder={null}
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
              hint="Inactive departments stay on existing records"
              {...bind('isActive')}
            />
          )}
        </div>
        <Textarea
          label="Description"
          rows={3}
          maxLength={500}
          placeholder="What does this department do?"
          hint={`${form.description.length}/500 characters`}
          {...bind('description')}
        />
      </section>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" icon={Save} loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
