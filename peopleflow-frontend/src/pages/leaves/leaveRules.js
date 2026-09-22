import { isAdmin, isManagement } from '../../utils/auth';

export const PAID_LEAVE_TYPES = ['casual', 'sick', 'earned'];

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/** 'YYYY-MM-DD' → local Date (new Date('YYYY-MM-DD') would be parsed as UTC). */
const parseInputDate = (value) => {
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Inclusive Mon–Sat day count, mirroring the server (Sundays are off). */
export function countWorkingDays(start, end) {
  if (!start || !end) return 0;
  const from = parseInputDate(start);
  const to = parseInputDate(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
  let count = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count += 1;
  }
  return count;
}

export const isOwnLeave = (leave, user) => Boolean(user && leave && String(leave.user?._id || leave.user) === String(user._id));

/** Owner may cancel pending requests, or approved ones that have not started yet. */
export function canCancelLeave(leave, user) {
  if (!isOwnLeave(leave, user)) return false;
  if (leave.status === 'pending') return true;
  return leave.status === 'approved' && new Date(leave.startDate) > startOfToday();
}

/** Management reviews pending requests; only admins may review their own. */
export function canReviewLeave(leave, user) {
  if (!leave || leave.status !== 'pending' || !isManagement(user)) return false;
  return isAdmin(user) || !isOwnLeave(leave, user);
}

export const shortText = (text = '', max = 60) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);
