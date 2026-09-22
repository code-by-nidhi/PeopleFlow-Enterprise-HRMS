import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Briefcase, Wallet } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { departmentsApi } from '../../api/endpoints';

const EMPTY = { title: '', department: '', description: '', min: '', max: '', isActive: 'true' };

const TITLE_REGEX = /^[A-Za-z&\-/ ]{2,50}$/;

/** Converts an API designation into form state. */
function toForm(designation) {
  return {
    title: designation.title || '',
    department: designation.department?._id || '',
    description: designation.description || '',
    min: designation.salaryRange?.min ?? '',
    max: designation.salaryRange?.max ?? '',
    isActive: designation.isActive === false ? 'false' : 'true',
  };
}

const validate = (form) => {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Designation title is required';
  else if (!TITLE_REGEX.test(form.title.trim())) errors.title = 'Use 2-50 letters, spaces, &, - or /';
  if (form.description.length > 500) errors.description = 'Description must be under 500 characters';
  if (form.min !== '' && Number(form.min) < 0) errors.min = 'Cannot be negative';
  if (form.max !== '' && Number(form.max) < 0) errors.max = 'Cannot be negative';
  if (!errors.min && !errors.max && form.min !== '' && form.max !== '' && Number(form.min) > Number(form.max)) {
    errors.max = 'Maximum must be greater than or equal to minimum';
  }
  return errors;
};

/**
 * Shared create/edit form; edit mode when `designation` (the API object) is passed.
 * `onSubmit(payload)` must return a promise and throw an Error with a readable message on failure.
 */
export function DesignationForm({ designation, onSubmit, submitLabel }) {
  const navigate = useNavigate();
  const isEdit = Boolean(designation);
  const [form, setForm] = useState(() => (designation ? toForm(designation) : EMPTY));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: departments, loading: departmentsLoading, error: departmentsError } = useFetch(
    (config) => departmentsApi.list(config),
    [],
  );

  const departmentOptions = useMemo(() => (departments || []).map((d) => ({
    value: d._id,
    label: d.isActive === false ? `${d.name} (inactive)` : d.name,
  })), [departments]);

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

    const hasRange = form.min !== '' || form.max !== '';
    const salaryRange = {
      min: form.min === '' ? undefined : Number(form.min),
      max: form.max === '' ? undefined : Number(form.max),
    };
    const payload = {
      title: form.title.trim().replace(/\s+/g, ' '),
      department: form.department,
      description: form.description.trim(),
      // On edit always send the range so clearing both fields removes it
      ...(hasRange || isEdit ? { salaryRange } : {}),
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

  const bindSalary = (key) => ({ ...bind(key), type: 'number', min: 0, inputMode: 'numeric' });

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-md">
      <Alert type="error">{serverError}</Alert>

      <section className="form-section">
        <div className="form-section-head">
          <Briefcase size={20} />
          <h3 className="form-section-title">Designation Details</h3>
        </div>
        <p className="form-section-desc">Job title and the department it belongs to</p>

        <div className="form-grid">
          <Input label="Title" placeholder="e.g. Senior Software Engineer" required maxLength={50} {...bind('title')} />
          <Select
            label="Department"
            placeholder={departmentsLoading ? 'Loading…' : 'All departments'}
            options={departmentOptions}
            hint={departmentsError ? 'Could not load departments' : 'Leave as "All departments" for company-wide roles'}
            {...bind('department')}
          />
          {isEdit && (
            <Select
              label="Status"
              placeholder={null}
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
              hint="Inactive designations stay on existing records"
              {...bind('isActive')}
            />
          )}
        </div>
        <Textarea
          label="Description"
          rows={3}
          maxLength={500}
          placeholder="Key responsibilities for this role"
          hint={`${form.description.length}/500 characters`}
          {...bind('description')}
        />
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <Wallet size={20} />
          <h3 className="form-section-title">Salary Band</h3>
        </div>
        <p className="form-section-desc">Optional monthly gross range in INR, shown as guidance when setting employee salaries</p>
        <div className="form-grid">
          <Input label="Minimum" placeholder="30000" {...bindSalary('min')} />
          <Input label="Maximum" placeholder="60000" {...bindSalary('max')} />
        </div>
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
