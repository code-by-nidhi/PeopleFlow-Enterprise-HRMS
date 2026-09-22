const KEY = 'pf:device-id';
let cached = null;

function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A random id for this browser, sent with attendance requests so HR can spot one
 * phone being used by several employees. It is an audit hint only, never a credential.
 */
export function getDeviceId() {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(KEY);
    if (!cached) {
      cached = randomId();
      localStorage.setItem(KEY, cached);
    }
  } catch {
    cached = randomId();
  }
  return cached;
}
