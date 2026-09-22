import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { attendanceApi, officesApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { ATTENDANCE_STATUS_LABELS, toOptions } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/format';

/** Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
const toInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toIso = (local) => (local ? new Date(local).toISOString() : null);

/**
 * Manual correction of one attendance record, or (without `record`) a new record
 * for a day with no verified check-in. Every change needs a reason and is audited.
 */
export function CorrectionDialog({ isOpen, record, userId, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !record;
  const [form, setForm] = useState({ checkIn: '', checkOut: '', status: '', officeId: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { data: offices } = useFetch((config) => officesApi.list({ status: 'active' }, config), [], { enabled: isOpen && isNew });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      checkIn: toInputDateTime(record?.checkIn),
      checkOut: toInputDateTime(record?.checkOut),
      status: '',
      officeId: '',
      reason: '',
    });
    setError(null);
  }, [isOpen, record]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    setError(null);
    if (form.reason.trim().length < 5) {
      setError('Please give a reason for this change (at least 5 characters).');
      return;
    }
    if (!form.checkIn) {
      setError('Check-in time is required.');
      return;
    }
    if (form.checkOut && new Date(form.checkOut) <= new Date(form.checkIn)) {
      setError('Check-out must be after check-in.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await attendanceApi.createManual({
          userId,
          officeId: form.officeId || undefined,
          checkIn: toIso(form.checkIn),
          checkOut: toIso(form.checkOut) || undefined,
          status: form.status || undefined,
          reason: form.reason.trim(),
        });
      } else {
        const body = { reason: form.reason.trim() };
        if (form.checkIn !== toInputDateTime(record.checkIn)) body.checkIn = toIso(form.checkIn);
        if (form.checkOut !== toInputDateTime(record.checkOut)) body.checkOut = toIso(form.checkOut);
        if (form.status) body.status = form.status;
        if (Object.keys(body).length === 1) {
          setError('Change at least one value before saving.');
          setSaving(false);
          return;
        }
        await attendanceApi.correct(record._id, body);
      }
      toast.success(isNew ? 'Attendance recorded' : 'Attendance corrected');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Add attendance record' : `Correct attendance · ${formatDate(record?.date)}`}
      confirmLabel={isNew ? 'Add Record' : 'Save Correction'}
      onConfirm={save}
      confirmLoading={saving}
      maxWidth={520}
    >
      <div className="stack-sm">
        <Alert type="info" style={{ marginBottom: 0 }}>
          Manual changes bypass location and QR verification. They are marked as manual, the employee is notified,
          and your name and reason are kept in the audit log.
        </Alert>
        {error && <Alert type="error" style={{ marginBottom: 0 }}>{error}</Alert>}

        {isNew && (
          <Select
            label="Office"
            placeholder="No specific office"
            options={(offices || []).map((o) => ({ value: o._id, label: `${o.name} (${o.code})` }))}
            value={form.officeId}
            onChange={set('officeId')}
            hint="Decides the time zone, late threshold and who may correct this record."
          />
        )}
        <div className="form-grid">
          <Input label="Check in" type="datetime-local" required value={form.checkIn} onChange={set('checkIn')} />
          <Input label="Check out" type="datetime-local" value={form.checkOut} min={form.checkIn || undefined} onChange={set('checkOut')} hint="Leave empty if still working." />
        </div>
        <Select
          label="Status"
          placeholder="Work it out from the times"
          options={toOptions(ATTENDANCE_STATUS_LABELS)}
          value={form.status}
          onChange={set('status')}
        />
        <Textarea
          label="Reason"
          required
          rows={3}
          value={form.reason}
          onChange={set('reason')}
          placeholder="e.g. Forgot to check out, confirmed by reporting manager"
          hint="Times are in this device's time zone."
        />

        {record?.corrections?.length > 0 && (
          <div className="stack-sm">
            <span className="text-xs text-bold text-muted">Previous corrections</span>
            {record.corrections.map((c) => (
              <div key={`${c.at}-${c.reason}`} className="text-xs text-muted">
                {formatDateTime(c.at)} · {c.reason}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
