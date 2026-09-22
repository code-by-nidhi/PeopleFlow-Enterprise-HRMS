const STORAGE_KEY = 'pf:preferences';

export const DEFAULT_PREFERENCES = {
  theme: 'light', // 'light' | 'dark' | 'system'
  pageSize: 10,
  desktopNotifications: false,
};

export function getPreferences() {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function getPreference(key) {
  return getPreferences()[key];
}

export function savePreferences(patch) {
  const next = { ...getPreferences(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); preferences then last for the session only
  }
  if (patch.theme) applyTheme(next.theme);
  return next;
}

export function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
