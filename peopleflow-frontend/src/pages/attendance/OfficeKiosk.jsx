import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Maximize, RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useNotifications } from '../../context/NotificationContext';
import { officesApi } from '../../api/endpoints';
import { getErrorMessage } from '../../api/client';
import { LiveClock } from './LiveClock';

// Rotate a little before expiry so a code is never shown in its last seconds
const REFRESH_LEAD_MS = 5000;
const RETRY_MS = 5000;

/**
 * Office entrance screen. Shows a server-issued, single-use QR code that rotates
 * on expiry and immediately after every successful scan (via Socket.io).
 */
export function OfficeKiosk() {
  const { officeId } = useParams();
  const navigate = useNavigate();
  const { socket } = useNotifications();
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  const [scans, setScans] = useState(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState(() => document.hidden);

  // Server clock minus device clock, so the countdown is right even if this tablet's clock is off
  const offsetRef = useRef(0);
  const inflightRef = useRef(null);

  const refresh = useCallback(() => {
    if (inflightRef.current) return inflightRef.current;
    inflightRef.current = officesApi.generateQr(officeId)
      .then((res) => {
        const data = res.data.data;
        offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
        setQr({ ...data, expiresAtMs: new Date(data.expiresAt).getTime() });
        setError(null);
      })
      .catch((err) => {
        // Never leave a code on screen that may already be dead
        setQr(null);
        setError(getErrorMessage(err, 'Could not load a QR code.'));
      })
      .finally(() => {
        inflightRef.current = null;
      });
    return inflightRef.current;
  }, [officeId]);

  // Schedule the next rotation (or a retry after an error); paused while the tab is hidden
  useEffect(() => {
    if (hidden) return undefined;
    let delay = RETRY_MS;
    if (qr) delay = Math.max(1000, qr.expiresAtMs - (Date.now() + offsetRef.current) - REFRESH_LEAD_MS);
    else if (!error) delay = 0;
    const timer = setTimeout(refresh, delay);
    return () => clearTimeout(timer);
  }, [qr, error, hidden, refresh]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    const ticker = setInterval(() => setNow(Date.now()), 250);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(ticker);
    };
  }, []);

  // Rotate as soon as someone uses the current code
  useEffect(() => {
    if (!socket) return undefined;
    let flashTimer = null;
    const join = () => socket.emit('kiosk:join', officeId);
    const onConsumed = (payload) => {
      if (payload?.officeId !== officeId) return;
      setScans((n) => n + 1);
      setFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setFlash(false), 1500);
      refresh();
    };
    join();
    socket.on('connect', join);
    socket.on('attendance:qr-consumed', onConsumed);
    return () => {
      clearTimeout(flashTimer);
      socket.off('connect', join);
      socket.off('attendance:qr-consumed', onConsumed);
      socket.emit('kiosk:leave', officeId);
    };
  }, [socket, officeId, refresh]);

  // Keep the screen awake where the browser allows it
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        if (!document.hidden && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      } catch {
        // Not supported or not allowed; the kiosk still works
      }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const remainingMs = qr ? Math.max(0, qr.expiresAtMs - (now + offsetRef.current)) : 0;
  const percent = qr ? Math.min(100, (remainingMs / (qr.ttlSeconds * 1000)) * 100) : 0;

  return (
    <div className="kiosk-page">
      <header className="kiosk-header">
        <div>
          <div className="kiosk-office">
            {qr?.office?.name || 'Office attendance'}
            {qr?.office?.code && <span className="kiosk-code">{qr.office.code}</span>}
          </div>
          <LiveClock className="kiosk-clock" />
        </div>
        <div className="row">
          <Button variant="secondary" size="sm" icon={Maximize} onClick={toggleFullscreen}>Full screen</Button>
          <Button variant="ghost" size="sm" icon={X} onClick={() => navigate('/attendance/offices')}>Exit</Button>
        </div>
      </header>

      <main className="kiosk-body">
        <h1 className="kiosk-title">Scan to check in or out</h1>
        <p className="kiosk-subtitle">
          On your phone open PeopleFlow → <strong>My Attendance</strong> → <strong>Check In</strong> or <strong>Check Out</strong>, then scan this code.
        </p>

        <div className={`kiosk-qr ${flash ? 'flash' : ''}`}>
          {qr && <img src={qr.image} alt="Office attendance QR code" draggable={false} />}
          {!qr && !error && <span className="spinner" style={{ width: 40, height: 40 }} />}
          {!qr && error && (
            <div className="kiosk-qr-error" role="alert">
              <WifiOff size={36} />
              <span>{error}</span>
              <span className="text-xs">Retrying automatically…</span>
            </div>
          )}
          {flash && (
            <div className="kiosk-flash" role="status">
              <CheckCircle2 size={28} /> Scanned. New code ready.
            </div>
          )}
        </div>

        {qr && (
          <div className="kiosk-timer">
            <div className="meter">
              <span style={{ width: `${percent}%`, backgroundColor: percent < 25 ? 'var(--warning)' : 'var(--success)' }} />
            </div>
            <div className="row-between text-sm">
              <span>New code in {Math.ceil(Math.max(0, remainingMs - REFRESH_LEAD_MS) / 1000)}s · each code works once</span>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={refresh}>New code</Button>
            </div>
          </div>
        )}
        <p className="text-xs kiosk-footnote">
          {scans > 0 ? `${scans} scan${scans === 1 ? '' : 's'} on this screen · ` : ''}
          {socket?.connected === false ? 'Live updates offline: codes rotate on a timer.' : 'Codes rotate instantly after each scan.'}
        </p>
      </main>
    </div>
  );
}
