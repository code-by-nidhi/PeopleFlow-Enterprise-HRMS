import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Crosshair, ExternalLink, MapPin, MonitorSmartphone, PencilLine, Plus, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Alert } from '../../components/common/Feedback';
import { DataTable } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { officesApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { ROLE_LABELS } from '../../utils/constants';
import { getCurrentLocation } from './verification/geolocation';

const DEFAULTS = {
  name: '',
  code: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  qrTtlSeconds: '45',
  maxAccuracyMeters: '100',
  officeStart: '09:30',
  halfDayHours: '4',
  maxShiftHours: '16',
  correctionRoles: ['admin', 'hr'],
  isActive: true,
};

const toForm = (office) => (office ? {
  name: office.name,
  code: office.code,
  address: office.address || '',
  latitude: String(office.location.latitude),
  longitude: String(office.location.longitude),
  radiusMeters: String(office.radiusMeters),
  timezone: office.timezone,
  qrTtlSeconds: String(office.qrTtlSeconds),
  maxAccuracyMeters: String(office.maxAccuracyMeters),
  officeStart: office.rules?.officeStart || '09:30',
  halfDayHours: String(office.rules?.halfDayHours ?? 4),
  maxShiftHours: String(office.rules?.maxShiftHours ?? 16),
  correctionRoles: office.correctionRoles || ['admin', 'hr'],
  isActive: office.isActive,
} : DEFAULTS);

const timeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return null;
  }
};

const mapUrl = (lat, lng) => `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;

function OfficeForm({ office, isOpen, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [locationNote, setLocationNote] = useState(null);
  const zones = useMemo(timeZones, []);

  useEffect(() => {
    if (!isOpen) return;
    setForm(toForm(office));
    setError(null);
    setLocationNote(null);
  }, [isOpen, office]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const toggleRole = (role) => setForm((prev) => ({
    ...prev,
    correctionRoles: prev.correctionRoles.includes(role) ? prev.correctionRoles.filter((r) => r !== role) : [...prev.correctionRoles, role],
  }));

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocationNote(null);
    try {
      const fix = await getCurrentLocation();
      setForm((prev) => ({ ...prev, latitude: fix.latitude.toFixed(6), longitude: fix.longitude.toFixed(6) }));
      setLocationNote(`Captured with ±${Math.round(fix.accuracy)} m accuracy. Stand near the centre of the office for the best result.`);
    } catch (err) {
      setLocationNote(err.message);
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    setError(null);
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim(),
      location: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
      radiusMeters: Number(form.radiusMeters),
      timezone: form.timezone,
      qrTtlSeconds: Number(form.qrTtlSeconds),
      maxAccuracyMeters: Number(form.maxAccuracyMeters),
      rules: { officeStart: form.officeStart, halfDayHours: Number(form.halfDayHours), maxShiftHours: Number(form.maxShiftHours) },
      correctionRoles: form.correctionRoles,
    };
    if (office) body.isActive = form.isActive;
    if (form.latitude === '' || form.longitude === '') {
      setError('Set the office latitude and longitude.');
      return;
    }

    setSaving(true);
    try {
      if (office) await officesApi.update(office._id, body);
      else await officesApi.create(body);
      toast.success(office ? 'Office updated' : 'Office created');
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const hasPoint = form.latitude !== '' && form.longitude !== '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={office ? `Edit ${office.name}` : 'Add office'}
      confirmLabel={office ? 'Save Changes' : 'Create Office'}
      onConfirm={save}
      confirmLoading={saving}
      maxWidth={640}
    >
      <div className="stack-sm">
        {error && <Alert type="error" style={{ marginBottom: 0 }}>{error}</Alert>}

        <div className="form-grid">
          <Input label="Office name" required value={form.name} onChange={set('name')} placeholder="Head Office" />
          <Input label="Office code" required value={form.code} onChange={set('code')} placeholder="HQ" hint="Shown on the QR kiosk" />
        </div>
        <Input label="Address" value={form.address} onChange={set('address')} placeholder="Optional" />

        <div className="form-section-head" style={{ marginTop: '0.5rem' }}>
          <MapPin size={16} />
          <span className="text-bold text-sm">Geofence</span>
        </div>
        <div className="form-grid">
          <Input label="Latitude" required type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="31.326015" />
          <Input label="Longitude" required type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="75.576180" />
        </div>
        <div className="row">
          <Button variant="secondary" size="sm" icon={Crosshair} loading={locating} onClick={useCurrentLocation}>
            Use my current location
          </Button>
          {hasPoint && (
            <a className="link text-sm" href={mapUrl(form.latitude, form.longitude)} target="_blank" rel="noopener noreferrer">
              Check on map <ExternalLink size={12} />
            </a>
          )}
        </div>
        {locationNote && <p className="text-xs text-muted">{locationNote}</p>}
        <div className="form-grid">
          <Input label="Allowed radius (m)" required type="number" min={10} max={5000} value={form.radiusMeters} onChange={set('radiusMeters')} hint="10–5000 m. Cover the building plus a small margin." />
          <Input label="Max GPS inaccuracy (m)" required type="number" min={10} max={500} value={form.maxAccuracyMeters} onChange={set('maxAccuracyMeters')} hint="Readings less precise than this are rejected." />
        </div>

        <div className="form-section-head" style={{ marginTop: '0.5rem' }}>
          <MonitorSmartphone size={16} />
          <span className="text-bold text-sm">QR kiosk & rules</span>
        </div>
        <div className="form-grid">
          {zones ? (
            <Select label="Time zone" required placeholder={null} options={zones} value={form.timezone} onChange={set('timezone')} />
          ) : (
            <Input label="Time zone" required value={form.timezone} onChange={set('timezone')} placeholder="Asia/Kolkata" />
          )}
          <Input label="QR expires after (s)" required type="number" min={15} max={300} value={form.qrTtlSeconds} onChange={set('qrTtlSeconds')} hint="15–300 s. Each code also works only once." />
          <Input label="Office starts at" required type="time" value={form.officeStart} onChange={set('officeStart')} hint="Later check-ins are marked late." />
          <Input label="Half day below (hours)" required type="number" min={1} max={12} step="0.5" value={form.halfDayHours} onChange={set('halfDayHours')} />
          <Input label="Longest shift (hours)" required type="number" min={4} max={24} value={form.maxShiftHours} onChange={set('maxShiftHours')} hint="Open check-ins older than this no longer block a new day." />
        </div>

        <div className="stack-sm">
          <span className="form-label">Who may correct attendance manually</span>
          <label className="checkbox-row">
            <span>{ROLE_LABELS.admin} <span className="text-xs text-muted">(always)</span></span>
            <input type="checkbox" checked disabled />
          </label>
          {['hr', 'manager'].map((role) => (
            <label key={role} className="checkbox-row">
              <span>{ROLE_LABELS[role]}</span>
              <input type="checkbox" checked={form.correctionRoles.includes(role)} onChange={() => toggleRole(role)} />
            </label>
          ))}
        </div>

        {office && (
          <label className="checkbox-row">
            <span>
              <span className="text-bold" style={{ display: 'block' }}>Office active</span>
              <span className="text-xs text-muted">Inactive offices accept no check-ins and cannot show QR codes.</span>
            </span>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
          </label>
        )}
      </div>
    </Modal>
  );
}

export function OfficeSettings() {
  const navigate = useNavigate();
  const { data: offices, loading, error, reload } = useFetch((config) => officesApi.list(undefined, config), []);
  // `undefined` = closed, `null` = new office
  const [editing, setEditing] = useState(undefined);

  const columns = [
    {
      key: 'name',
      header: 'Office',
      lead: true,
      render: (o) => (
        <div>
          <div className="cell-primary">{o.name} <span className="text-faint">· {o.code}</span></div>
          <div className="cell-secondary">{o.address || o.timezone}</div>
        </div>
      ),
    },
    {
      key: 'geofence',
      header: 'Geofence',
      render: (o) => (
        <div>
          <div className="nowrap">{o.radiusMeters} m radius</div>
          <a className="cell-secondary link" href={mapUrl(o.location.latitude, o.location.longitude)} target="_blank" rel="noopener noreferrer">
            {o.location.latitude.toFixed(5)}, {o.location.longitude.toFixed(5)}
          </a>
        </div>
      ),
    },
    { key: 'qr', header: 'QR expiry', render: (o) => `${o.qrTtlSeconds}s · single use` },
    { key: 'rules', header: 'Rules', render: (o) => <span className="nowrap">Starts {o.rules?.officeStart} · half day &lt; {o.rules?.halfDayHours}h</span> },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <div className="table-actions">
          <Button variant="secondary" size="sm" icon={MonitorSmartphone} disabled={!o.isActive} onClick={() => navigate(`/attendance/kiosk/${o._id}`)}>
            Open QR Kiosk
          </Button>
          <Button variant="ghost" size="sm" icon={PencilLine} onClick={() => setEditing(o)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Office Locations" subtitle="Geofences, rotating QR kiosks and attendance rules for verified check-in">
        <Button variant="secondary" icon={ShieldAlert} onClick={() => navigate('/attendance/audit')}>
          Audit Log
        </Button>
        <Button icon={Plus} onClick={() => setEditing(null)}>
          Add Office
        </Button>
      </PageHeader>

      <Alert type="info">
        Employees can check in or out only when the server confirms their GPS position is inside an office geofence
        <strong> and</strong> they scan the live QR code shown on that office&apos;s kiosk. Open the kiosk on a screen or tablet at the entrance.
      </Alert>

      <div className="table-container">
        <DataTable
          columns={columns}
          rows={offices || []}
          loading={loading}
          error={error}
          onRetry={reload}
          empty={{
            icon: Building,
            title: 'No offices yet',
            description: 'Add your first office so employees can check in.',
          }}
        />
      </div>

      <OfficeForm office={editing} isOpen={editing !== undefined} onClose={() => setEditing(undefined)} onSaved={reload} />
    </div>
  );
}
