import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, MapPin, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/common/Table';
import { Pagination } from '../../components/common/Pagination';
import { PersonCell } from '../../components/common/Avatar';
import { DetailItem } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { attendanceApi } from '../../api/endpoints';
import {
  ATTENDANCE_REASON_LABELS, AUDIT_ACTION_LABELS, AUDIT_ACTION_TONES, ROLE_LABELS, toOptions,
} from '../../utils/constants';
import { formatDateTime, formatTime, toInputDate } from '../../utils/format';

const SCOPE_OPTIONS = [
  { value: 'true', label: 'Failed verifications only' },
];

const reasonText = (code) => (code ? ATTENDANCE_REASON_LABELS[code] || code : null);

function ActionBadge({ action }) {
  return (
    <span className={`badge badge-${AUDIT_ACTION_TONES[action] || 'neutral'}`}>
      <span className="badge-dot" />
      {AUDIT_ACTION_LABELS[action] || action}
    </span>
  );
}

const describeTimes = (snapshot) => {
  if (!snapshot) return '—';
  const inTime = snapshot.checkIn ? formatDateTime(snapshot.checkIn) : '—';
  const outTime = snapshot.checkOut ? formatTime(snapshot.checkOut) : 'open';
  return `${inTime} → ${outTime} · ${snapshot.status}`;
};

function AuditDetails({ entry, onClose }) {
  const meta = entry?.metadata || {};
  const loc = entry?.location;
  const flags = meta.flags || [];
  return (
    <Modal isOpen={Boolean(entry)} onClose={onClose} title="Audit entry" footer={<Button onClick={onClose}>Close</Button>} maxWidth={560}>
      {entry && (
        <div className="stack">
          <div className="row-between">
            <ActionBadge action={entry.action} />
            <span className="text-sm text-muted">{formatDateTime(entry.createdAt)}</span>
          </div>
          <div className="detail-list">
            <DetailItem label="Employee">{entry.user ? `${entry.user.name} · ${entry.user.email}` : null}</DetailItem>
            {entry.performedBy && String(entry.performedBy._id) !== String(entry.user?._id) && (
              <DetailItem label="Performed by">{`${entry.performedBy.name} (${ROLE_LABELS[entry.performedBy.role] || entry.performedBy.role})`}</DetailItem>
            )}
            <DetailItem label="Attendance action">{meta.attendanceAction}</DetailItem>
            <DetailItem label="Reason">{reasonText(entry.reason)}</DetailItem>
            <DetailItem label="Office">{entry.office ? `${entry.office.name} (${entry.office.code})` : null}</DetailItem>
            {loc?.latitude !== undefined && (
              <DetailItem icon={MapPin} label="Reported location">
                <a className="link" href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener noreferrer">
                  {loc.latitude}, {loc.longitude} <ExternalLink size={12} />
                </a>
              </DetailItem>
            )}
            {(meta.distance !== undefined || loc?.distance !== undefined) && (
              <DetailItem label="Distance from office">
                {`${meta.distance ?? loc.distance} m (allowed ${meta.radiusMeters ?? '—'} m)`}
              </DetailItem>
            )}
            {(meta.accuracy !== undefined || loc?.accuracy !== undefined) && (
              <DetailItem label="GPS accuracy">
                {`±${Math.round(meta.accuracy ?? loc.accuracy)} m${meta.maxAccuracyMeters ? ` (max ${meta.maxAccuracyMeters} m)` : ''}`}
              </DetailItem>
            )}
            {meta.clockSkewMs !== undefined && meta.clockSkewMs !== null && (
              <DetailItem label="Device clock difference">{`${Math.round(meta.clockSkewMs / 1000)} s`}</DetailItem>
            )}
            {flags.length > 0 && <DetailItem label="Flags">{flags.map(reasonText).join(', ')}</DetailItem>}
            {meta.reason && <DetailItem label="Correction reason">{meta.reason}</DetailItem>}
            {(meta.before !== undefined || meta.after !== undefined) && entry.action.startsWith('MANUAL') && (
              <>
                <DetailItem label="Before">{describeTimes(meta.before)}</DetailItem>
                <DetailItem label="After">{describeTimes(meta.after)}</DetailItem>
              </>
            )}
            {entry.action.startsWith('OFFICE') && meta.after && (
              <DetailItem label="Changes">
                {Object.keys(meta.after).map((key) => `${key}: ${JSON.stringify(meta.before?.[key])} → ${JSON.stringify(meta.after[key])}`).join('; ')}
              </DetailItem>
            )}
            <DetailItem label="IP address">{entry.ipAddress}</DetailItem>
            <DetailItem label="Device id">{entry.deviceId}</DetailItem>
            <DetailItem label="Browser">{entry.userAgent}</DetailItem>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AttendanceAudit() {
  const navigate = useNavigate();
  const today = toInputDate();
  const [selected, setSelected] = useState(null);
  const { filters, setFilter, search, setSearch, setPage, params, paramsKey, resetFilters } = useListQuery({
    failed: 'true',
    action: '',
    from: '',
    to: '',
  });

  const { data: entries, meta, loading, error, reload } = useFetch((config) => attendanceApi.audit(params, config), [paramsKey]);
  const hasFilters = Boolean(search || filters.action || filters.from || filters.to || filters.failed !== 'true');

  const columns = [
    { key: 'time', header: 'Time', render: (e) => <span className="nowrap">{formatDateTime(e.createdAt)}</span> },
    {
      key: 'employee',
      header: 'Employee',
      lead: true,
      render: (e) => (e.user
        ? <PersonCell name={e.user.name} subtitle={e.user.email} avatar={e.user.avatar?.url} />
        : <span className="text-muted">{e.performedBy?.name || '—'}</span>),
    },
    { key: 'action', header: 'Event', render: (e) => <ActionBadge action={e.action} /> },
    {
      key: 'reason',
      header: 'Reason',
      render: (e) => {
        const flags = e.metadata?.flags || [];
        const text = reasonText(e.reason) || (flags.length ? `Flagged: ${flags.map(reasonText).join(', ')}` : '—');
        return <span className={e.reason || flags.length ? '' : 'text-faint'}>{text}</span>;
      },
    },
    { key: 'office', header: 'Office', render: (e) => e.office?.name || <span className="text-faint">—</span> },
    {
      key: 'location',
      header: 'Location',
      render: (e) => {
        const distance = e.metadata?.distance ?? e.location?.distance;
        const accuracy = e.location?.accuracy;
        if (distance === undefined && accuracy === undefined) return <span className="text-faint">—</span>;
        return <span className="nowrap">{distance !== undefined ? `${distance} m away` : ''}{accuracy !== undefined ? ` · ±${accuracy} m` : ''}</span>;
      },
    },
    { key: 'ip', header: 'IP', render: (e) => <span className="nowrap text-sm">{e.ipAddress || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Attendance Audit" subtitle="Every check-in attempt, rejection and manual change, newest first">
        <Button variant="secondary" icon={ShieldCheck} onClick={() => navigate('/attendance/offices')}>
          Offices
        </Button>
      </PageHeader>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="toolbar-search">
            <Input
              compact
              type="search"
              placeholder="Search by employee name…"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search audit log"
            />
          </div>
          <div className="toolbar-filters">
            <Select
              compact
              placeholder="All events"
              options={SCOPE_OPTIONS}
              value={filters.failed}
              onChange={(e) => setFilter('failed', e.target.value)}
            />
            {filters.failed !== 'true' && (
              <Select
                compact
                placeholder="Any event type"
                options={toOptions(AUDIT_ACTION_LABELS)}
                value={filters.action}
                onChange={(e) => setFilter('action', e.target.value)}
              />
            )}
            <Input compact type="date" aria-label="From date" max={filters.to || today} value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
            <Input compact type="date" aria-label="To date" min={filters.from || undefined} max={today} value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={entries || []}
          loading={loading}
          error={error}
          onRetry={reload}
          onRowClick={setSelected}
          empty={{
            icon: ShieldCheck,
            title: filters.failed === 'true' ? 'No failed attempts' : 'No audit entries',
            description: filters.failed === 'true' ? 'Rejected check-ins and check-outs will show up here.' : 'Try a different filter.',
          }}
        />

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <AuditDetails entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
