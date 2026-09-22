import React, { useCallback, useState } from 'react';
import { LogIn, LogOut, MapPin, QrCode } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Alert, LoadError } from '../../components/common/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { useListQuery } from '../../hooks/useListQuery';
import { attendanceApi } from '../../api/endpoints';
import { ATTENDANCE_STATUS_LABELS } from '../../utils/constants';
import { formatDate, formatHours, formatTime } from '../../utils/format';
import { LiveClock } from './LiveClock';
import { MonthSummaryStats } from './MonthSummaryStats';
import { AttendanceHistory } from './AttendanceHistory';
import { AttendanceCheckFlow } from './verification/AttendanceCheckFlow';

const HALF_DAY_HOURS = 4;

export function MyAttendance() {
  const [confirmCheckOut, setConfirmCheckOut] = useState(false);
  const [flowAction, setFlowAction] = useState(null);
  const { filters, setFilter, setPage, params, paramsKey, resetFilters } = useListQuery({ from: '', to: '' });

  const { data: records, meta, loading, error, reload } = useFetch((config) => attendanceApi.me(params, config), [paramsKey]);
  const { data: state, reload: reloadState } = useFetch((config) => attendanceApi.today(config), []);

  // The open session may have started yesterday (night shift), so it comes from /today
  const today = state?.record || null;
  const checkedOut = Boolean(today?.checkOut);

  const closeFlow = useCallback(() => {
    setFlowAction(null);
    reload();
    reloadState();
  }, [reload, reloadState]);

  const hoursSoFar = today && !checkedOut ? (Date.now() - new Date(today.checkIn).getTime()) / 3600000 : 0;

  // The hero depends on meta; if the very first load fails there is nothing to show
  if (error && !meta) {
    return (
      <div>
        <PageHeader title="My Attendance" subtitle="Check in, check out and review your attendance history" />
        <LoadError message={error} onRetry={reload} />
      </div>
    );
  }

  let statusLine;
  if (!state) statusLine = 'Loading today’s status…';
  else if (!today) statusLine = 'You have not checked in today';
  else if (!checkedOut) statusLine = `Checked in at ${formatTime(today.checkIn)}${today.office?.name ? ` · ${today.office.name}` : ''} · time on the clock`;
  else statusLine = `${formatTime(today.checkIn)} – ${formatTime(today.checkOut)} · total working time`;

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Check in, check out and review your attendance history" />

      {state && !state.attendanceConfigured && (
        <Alert type="warning">
          Attendance check-in has not been set up yet. HR needs to add an office location before you can check in.
        </Alert>
      )}

      <div className="card card-highlight checkin-card section-gap">
        <div className="stack-sm">
          <div className="row">
            <span className="text-sm text-bold">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {today && <StatusBadge status={today.status} label={ATTENDANCE_STATUS_LABELS[today.status]} />}
          </div>
          {today && checkedOut ? (
            <div className="checkin-clock">{formatHours(today.workingHours)}</div>
          ) : (
            <LiveClock since={today?.checkIn} />
          )}
          <span className="text-sm">{statusLine}</span>
          <span className="checkin-hint">
            <MapPin size={14} /> Be inside the office <QrCode size={14} /> Scan the office QR code
          </span>
        </div>

        <div className="row">
          <Button
            variant="accent"
            size="lg"
            icon={LogIn}
            disabled={!state?.canCheckIn || !state?.attendanceConfigured || Boolean(flowAction)}
            onClick={() => setFlowAction('check-in')}
          >
            Check In
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={LogOut}
            disabled={!state?.canCheckOut || !state?.attendanceConfigured || Boolean(flowAction)}
            onClick={() => setConfirmCheckOut(true)}
          >
            {checkedOut ? 'Checked Out' : 'Check Out'}
          </Button>
        </div>
      </div>

      <MonthSummaryStats summary={meta?.monthSummary} loading={loading} />

      <AttendanceHistory
        title="Attendance History"
        records={records}
        meta={meta}
        loading={loading}
        error={error}
        onRetry={reload}
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        setPage={setPage}
      />

      <Modal
        isOpen={confirmCheckOut}
        onClose={() => setConfirmCheckOut(false)}
        title="Check out for today?"
        confirmLabel="Continue"
        onConfirm={() => {
          setConfirmCheckOut(false);
          setFlowAction('check-out');
        }}
      >
        <div className="stack-sm">
          <p>
            You checked in at <strong>{formatTime(today?.checkIn)}</strong>. You can only check out once per day, and you will need to scan the office QR code.
          </p>
          {hoursSoFar < HALF_DAY_HOURS && (
            <p className="text-sm text-danger">
              You have worked less than {HALF_DAY_HOURS} hours, so today will be recorded as a half day.
            </p>
          )}
        </div>
      </Modal>

      <AttendanceCheckFlow action={flowAction} onClose={closeFlow} />
    </div>
  );
}
