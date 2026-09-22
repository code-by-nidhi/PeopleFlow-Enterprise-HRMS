import React, { useState } from 'react';
import { CalendarPlus, Send } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { useToast } from '../../context/ToastContext';
import { leavesApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { LEAVE_TYPE_LABELS } from '../../utils/constants';
import { toInputDate } from '../../utils/format';
import { PAID_LEAVE_TYPES, countWorkingDays } from './leaveRules';

const EMPTY = { leaveType: '', startDate: '', endDate: '', reason: '' };

const validate = (form, days, balance) => {
  const errors = {};
  const today = toInputDate();
  if (!form.leaveType) errors.leaveType = 'Select a leave type';
  if (!form.startDate) errors.startDate = 'Start date is required';
  else if (form.startDate < today) errors.startDate = 'Leave cannot start in the past';
  if (!form.endDate) errors.endDate = 'End date is required';
  else if (form.startDate && form.endDate < form.startDate) errors.endDate = 'End date cannot be before the start date';
  else if (form.startDate && days === 0) errors.endDate = 'The selected range only covers Sundays';
  if (!errors.endDate && PAID_LEAVE_TYPES.includes(form.leaveType) && balance && days > (balance[form.leaveType] ?? 0)) {
    errors.leaveType = `Only ${balance[form.leaveType] ?? 0} day(s) of ${LEAVE_TYPE_LABELS[form.leaveType].toLowerCase()} available`;
  }
  if (form.reason.trim().length < 5) errors.reason = 'Please give a reason (at least 5 characters)';
  return errors;
};

/** Inline "apply for leave" form. `onSubmitted` runs after a successful request. */
export function LeaveApplyForm({ balance, onCancel, onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = toInputDate();
  const days = countWorkingDays(form.startDate, form.endDate);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const bind = (key) => ({ name: key, value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] });

  const typeOptions = Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label: balance && PAID_LEAVE_TYPES.includes(value) ? `${label} (${balance[value] ?? 0} left)` : label,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form, days, balance);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setServerError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    setServerError('');
    try {
      await leavesApi.apply({ ...form, reason: form.reason.trim() });
    } catch (err) {
      setServerError(getErrorMessage(err));
      setSubmitting(false);
      return;
    }
    toast.success('Leave request submitted', `${days} working day${days === 1 ? '' : 's'} sent for approval`);
    setSubmitting(false);
    setForm(EMPTY);
    onSubmitted?.();
  };

  let preview = 'Pick your dates to see how many working days this uses.';
  if (form.startDate && form.endDate && form.endDate >= form.startDate) {
    preview = `${days} working day${days === 1 ? '' : 's'} (Sundays are not counted)`;
  }

  return (
    <form className="form-section" onSubmit={handleSubmit} noValidate>
      <div className="form-section-head">
        <CalendarPlus size={20} />
        <h3 className="form-section-title">Apply for Leave</h3>
      </div>
      <p className="form-section-desc">Your request is sent to HR and your manager for approval.</p>

      <Alert type="error">{serverError}</Alert>

      <div className="form-grid">
        <Select label="Leave Type" placeholder="Select leave type" required options={typeOptions} {...bind('leaveType')} />
        <Input
          label="Start Date"
          type="date"
          required
          min={today}
          {...bind('startDate')}
          onChange={(e) => {
            set('startDate', e.target.value);
            if (form.endDate && e.target.value && form.endDate < e.target.value) set('endDate', e.target.value);
          }}
        />
        <Input label="End Date" type="date" required min={form.startDate || today} {...bind('endDate')} />
      </div>
      <Alert type="info">{preview}</Alert>
      <Textarea
        label="Reason"
        required
        rows={3}
        maxLength={500}
        placeholder="Briefly explain the reason for your leave"
        hint={`${form.reason.length}/500`}
        {...bind('reason')}
      />

      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" icon={Send} loading={submitting}>
          Submit Request
        </Button>
      </div>
    </form>
  );
}
