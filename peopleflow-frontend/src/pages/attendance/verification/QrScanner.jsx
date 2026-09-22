import React, { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

const SCAN_INTERVAL_MS = 200;
const MAX_DECODE_WIDTH = 640;

const cameraError = (error) => {
  if (!window.isSecureContext) return 'The camera can only be used over a secure (HTTPS) connection.';
  if (error?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access for this site, then try again.';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (error?.name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'Could not start the camera. Please try again.';
};

/** Native BarcodeDetector where available (Android/Chrome), jsQR everywhere else. */
async function createDecoder(video, canvas) {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async () => (await detector.detect(video))[0]?.rawValue || null;
      }
    } catch {
      // Fall through to jsQR
    }
  }

  const { default: jsQR } = await import('jsqr');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async () => {
    const scale = Math.min(1, MAX_DECODE_WIDTH / video.videoWidth);
    const width = Math.floor(video.videoWidth * scale);
    const height = Math.floor(video.videoHeight * scale);
    if (!width || !height) return null;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

/**
 * Live camera preview that calls onResult(text) once with the first QR decoded.
 * The camera is released as soon as a code is read or the component unmounts.
 */
export function QrScanner({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState(null);

  useEffect(() => {
    let stopped = false;
    let stream = null;
    let frame = null;

    const release = () => {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(cameraError());
        setStatus('error');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (err) {
        if (!stopped) {
          setError(cameraError(err));
          setStatus('error');
        }
        return;
      }
      if (stopped) {
        release();
        return;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      const decode = await createDecoder(video, canvasRef.current);
      if (stopped) return;
      setStatus('scanning');

      let lastScan = 0;
      const tick = async (time) => {
        if (stopped) return;
        if (time - lastScan >= SCAN_INTERVAL_MS && video.readyState >= 2) {
          lastScan = time;
          const text = await decode().catch(() => null);
          if (text && !stopped) {
            release();
            onResultRef.current(text);
            return;
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    start();
    return release;
  }, []);

  if (status === 'error') {
    return (
      <div className="qr-scanner qr-scanner-error" role="alert">
        <CameraOff size={28} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      <video ref={videoRef} muted playsInline aria-label="Camera preview for scanning the office QR code" />
      <span className="qr-scanner-frame" aria-hidden="true" />
      {status === 'starting' && <span className="qr-scanner-status"><span className="spinner" /> Starting camera…</span>}
      <canvas ref={canvasRef} hidden />
    </div>
  );
}
