const LOCALE = 'en-IN';

const toDate = (value) => (value ? new Date(value) : null);
const isValid = (date) => date && !Number.isNaN(date.getTime());

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = toDate(value);
  return isValid(date) ? date.toLocaleDateString(LOCALE, options) : '—';
}

export function formatShortDate(value) {
  return formatDate(value, { day: 'numeric', month: 'short' });
}

export function formatTime(value) {
  const date = toDate(value);
  return isValid(date) ? date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '—';
}

export function formatDateTime(value) {
  const date = toDate(value);
  return isValid(date) ? `${formatDate(date)}, ${formatTime(date)}` : '—';
}

export function formatDateRange(start, end) {
  const a = formatShortDate(start);
  const b = formatShortDate(end);
  return a === b ? formatDate(start) : `${a} – ${formatDate(end)}`;
}

/** 7.5 → "7h 30m" */
export function formatHours(hours) {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) return '—';
  const totalMinutes = Math.round(Number(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function relativeTime(value) {
  const date = toDate(value);
  if (!isValid(date)) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

/** Local YYYY-MM-DD for <input type="date"> (toISOString would shift by timezone). */
export function toInputDate(value = new Date()) {
  const date = toDate(value);
  if (!isValid(date)) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

/** "in-progress" → "In Progress" */
export function labelize(value = '') {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function employeeName(employee) {
  if (!employee) return '—';
  return employee.fullName || [employee.firstName, employee.lastName].filter(Boolean).join(' ') || '—';
}

export function isOverdue(task) {
  if (!task || task.status === 'completed' || !task.deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.deadline) < today;
}

/** Drops empty strings/nulls so they are not sent as query params. */
export function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}
