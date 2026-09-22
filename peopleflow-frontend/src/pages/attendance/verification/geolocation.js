const MESSAGES = {
  INSECURE: 'Location can only be read over a secure (HTTPS) connection. Please open PeopleFlow using its https:// address.',
  UNSUPPORTED: 'This browser cannot share your location. Please use a phone or a browser with location support.',
  DENIED: 'Location permission was denied. Allow location access for this site in your browser settings, then try again.',
  UNAVAILABLE: 'Your location is currently unavailable. Turn on location services (GPS) and try again.',
  TIMEOUT: 'Getting your location took too long. Make sure GPS is on, move near a window and try again.',
};

export class LocationError extends Error {
  constructor(code) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

const ERROR_CODES = { 1: 'DENIED', 2: 'UNAVAILABLE', 3: 'TIMEOUT' };

/**
 * A fresh, high-accuracy GPS fix. The server decides whether it is inside the
 * office; this only reads the device. `maximumAge: 0` refuses cached positions.
 */
export function getCurrentLocation({ timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new LocationError('INSECURE'));
      return;
    }
    if (!('geolocation' in navigator)) {
      reject(new LocationError('UNSUPPORTED'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        // Informational only: the server never uses the device clock for attendance
        capturedAt: position.timestamp,
      }),
      (error) => reject(new LocationError(ERROR_CODES[error.code] || 'UNAVAILABLE')),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}
