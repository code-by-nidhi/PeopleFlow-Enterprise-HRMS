import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, ScanLine, ShieldCheck, XCircle } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Alert } from '../../../components/common/Feedback';
import { attendanceApi } from '../../../api/endpoints';
import { getErrorMessage } from '../../../api/client';
import { formatHours, formatTime } from '../../../utils/format';
import { getCurrentLocation } from './geolocation';
import { QrScanner } from './QrScanner';

const STEP_KEYS = ['account', 'location', 'qr', 'record'];

const LOCATION_CODES = new Set(['GPS_MISSING', 'GPS_INVALID', 'GPS_LOW_ACCURACY', 'GEOFENCE_OUTSIDE', 'GEOFENCE_BOUNDARY', 'NO_OFFICE_CONFIGURED']);
// The action itself is not possible right now; retrying will not help
const STATE_CODES = new Set(['ALREADY_CHECKED_IN', 'ACTIVE_SESSION_EXISTS', 'ALREADY_CHECKED_OUT', 'NO_ACTIVE_CHECK_IN', 'ON_LEAVE']);
const FINAL_CODES = new Set([...STATE_CODES, 'EMPLOYEE_INACTIVE', 'NO_OFFICE_CONFIGURED', 'RATE_LIMITED']);

const initialSteps = () => ({ account: 'active', location: 'active', qr: 'pending', record: 'pending' });

function stepForError(code, status, fallback) {
  if (code === 'EMPLOYEE_INACTIVE' || (!code && (status === 401 || status === 403))) return 'account';
  if (code && (LOCATION_CODES.has(code) || code.startsWith('VERIFICATION_'))) return 'location';
  if (code?.startsWith('QR_')) return 'qr';
  if (STATE_CODES.has(code) || code === 'DUPLICATE_REQUEST') return 'record';
  return fallback;
}

/** Steps before the failed one passed on the server; later ones never ran. */
function stepsAfterFailure(failedKey, qrVerified) {
  const next = {};
  let reached = false;
  STEP_KEYS.forEach((key) => {
    if (key === failedKey) {
      next[key] = 'failed';
      reached = true;
    } else if (reached || (key === 'qr' && !qrVerified)) {
      next[key] = 'pending';
    } else {
      next[key] = 'done';
    }
  });
  return next;
}

const STEP_ICONS = {
  done: <CheckCircle2 size={20} className="verify-step-icon done" />,
  failed: <XCircle size={20} className="verify-step-icon failed" />,
  active: <span className="spinner verify-step-icon" style={{ width: 18, height: 18 }} />,
  pending: <Circle size={20} className="verify-step-icon pending" />,
};

/**
 * Check-in / check-out with server-side verification:
 * account → GPS geofence → office QR → server-timestamped record.
 * Open it by passing action="check-in" | "check-out"; pass null to close.
 */
export function AttendanceCheckFlow({ action, onClose, onComplete }) {
  const verb = action === 'check-out' ? 'Check-out' : 'Check-in';
  const [steps, setSteps] = useState(initialSteps);
  const [phase, setPhase] = useState('idle');
  const [office, setOffice] = useState(null);
  const [failure, setFailure] = useState(null);
  const [record, setRecord] = useState(null);
  const [scanKey, setScanKey] = useState(0);

  const verificationRef = useRef(null);
  const lastSubmitRef = useRef(null);
  const busyRef = useRef(false);
  // Bumped on every (re)start and on close so late responses are ignored
  const runRef = useRef(0);

  const fail = useCallback((error, { submitting = false } = {}) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const networkError = !error?.isLocation && !error?.response;
    const step = error?.isLocation ? 'location' : stepForError(code, status, submitting ? 'record' : 'location');

    let retry = 'restart';
    let message = error?.isLocation ? error.message : getErrorMessage(error);
    if (submitting && (networkError || code === 'DUPLICATE_REQUEST')) {
      // Safe to repeat: the server returns the original result for the same verification
      retry = 'resubmit';
      if (networkError) message = `We could not confirm your ${verb.toLowerCase()} because of a network problem. Retry to confirm. You will not be recorded twice.`;
    } else if (code?.startsWith('QR_')) {
      retry = 'rescan';
    } else if (FINAL_CODES.has(code) || (!code && status === 403)) {
      retry = null;
    }

    const qrVerified = submitting && step === 'record' && !STATE_CODES.has(code);
    setSteps(stepsAfterFailure(step, qrVerified));
    setFailure({ message, retry });
    setPhase('failed');
  }, [verb]);

  const start = useCallback(async () => {
    const run = ++runRef.current;
    verificationRef.current = null;
    lastSubmitRef.current = null;
    setSteps(initialSteps());
    setFailure(null);
    setRecord(null);
    setOffice(null);
    setPhase('locating');

    let fix;
    try {
      fix = await getCurrentLocation();
    } catch (error) {
      if (run !== runRef.current) return;
      error.isLocation = true;
      fail(error);
      setSteps((s) => ({ ...s, account: 'pending' }));
      return;
    }
    if (run !== runRef.current) return;

    setPhase('verifying');
    try {
      const res = await attendanceApi.verifyLocation({ action, ...fix });
      if (run !== runRef.current) return;
      verificationRef.current = res.data.data;
      setOffice(res.data.data.office);
      setSteps({ account: 'done', location: 'done', qr: 'active', record: 'pending' });
      setPhase('scan');
    } catch (error) {
      if (run === runRef.current) fail(error);
    }
  }, [action, fail]);

  const submit = useCallback(async (payload) => {
    if (busyRef.current) return; // double-tap guard; the server is idempotent as well
    busyRef.current = true;
    const run = runRef.current;
    lastSubmitRef.current = payload;
    setFailure(null);
    setSteps({ account: 'done', location: 'done', qr: 'active', record: 'pending' });
    setPhase('submitting');

    try {
      const res = await (action === 'check-out' ? attendanceApi.checkOut(payload) : attendanceApi.checkIn(payload));
      if (run !== runRef.current) return;
      setRecord(res.data.data);
      setSteps({ account: 'done', location: 'done', qr: 'done', record: 'done' });
      setPhase('done');
      onComplete?.(res.data.data);
    } catch (error) {
      if (run === runRef.current) fail(error, { submitting: true });
    } finally {
      busyRef.current = false;
    }
  }, [action, fail, onComplete]);

  const handleScan = useCallback((qrCode) => {
    submit({ verificationId: verificationRef.current?.verificationId, qrCode });
  }, [submit]);

  const rescan = () => {
    setFailure(null);
    setSteps({ account: 'done', location: 'done', qr: 'active', record: 'pending' });
    setScanKey((k) => k + 1);
    setPhase('scan');
  };

  useEffect(() => {
    if (action) start();
    else runRef.current += 1;
  }, [action, start]);

  const retryButton = {
    restart: <Button onClick={start}>Try again</Button>,
    rescan: <Button icon={ScanLine} onClick={rescan}>Scan again</Button>,
    resubmit: <Button onClick={() => submit(lastSubmitRef.current)}>Retry</Button>,
  };

  let footer;
  if (phase === 'done') {
    footer = <Button onClick={onClose}>Done</Button>;
  } else if (phase === 'failed') {
    footer = (
      <>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {failure?.retry && retryButton[failure.retry]}
      </>
    );
  } else {
    footer = <Button variant="secondary" onClick={onClose} disabled={phase === 'submitting'}>Cancel</Button>;
  }

  const stepText = {
    account: 'Account verified',
    location: {
      locating: 'Getting your location…',
      verifying: 'Verifying your location…',
    }[phase] || (steps.location === 'done' && office ? `Office location verified · ${office.name}` : 'Office location verified'),
    qr: phase === 'submitting' ? 'Verifying office QR…' : 'Office QR verified',
    record: `${verb} recorded`,
  };

  const recordedAt = record && (action === 'check-out' ? record.checkOut : record.checkIn);

  return (
    <Modal
      isOpen={Boolean(action)}
      onClose={onClose}
      title={action === 'check-out' ? 'Check Out' : 'Check In'}
      footer={footer}
      confirmLoading={phase === 'submitting'}
      maxWidth={460}
    >
      <div className="stack">
        <ol className="verify-steps" aria-live="polite">
          {STEP_KEYS.map((key) => (
            <li key={key} className={`verify-step ${steps[key]}`}>
              {STEP_ICONS[steps[key]]}
              <span>{stepText[key]}</span>
            </li>
          ))}
        </ol>

        {phase === 'scan' && (
          <div className="stack-sm">
            <p className="text-sm text-bold">Please scan the office QR code.</p>
            <QrScanner key={scanKey} onResult={handleScan} />
            <p className="text-xs text-muted">
              Point your camera at the code on the office screen. It changes every few seconds, so scan the one showing now.
            </p>
          </div>
        )}

        {phase === 'done' && recordedAt && (
          <div className="verify-result">
            <ShieldCheck size={22} />
            <div>
              <div className="text-bold">{action === 'check-out' ? 'Checked out' : 'Checked in'} at {formatTime(recordedAt)}</div>
              <div className="text-xs text-muted">
                {action === 'check-out' ? `${formatHours(record.workingHours)} worked · ` : ''}
                Time recorded by the server
              </div>
            </div>
          </div>
        )}

        {phase === 'failed' && failure && (
          <Alert type="error" style={{ marginBottom: 0 }}>
            <strong>{verb} unsuccessful.</strong>
            <div>{failure.message}</div>
          </Alert>
        )}

        {(phase === 'locating' || phase === 'verifying') && (
          <p className="text-xs text-muted">
            Your location is used only to confirm you are at the office and is kept with this attendance record.
          </p>
        )}
      </div>
    </Modal>
  );
}
