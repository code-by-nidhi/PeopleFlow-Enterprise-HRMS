export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER];
export const ORG_EDITORS = [ROLES.ADMIN, ROLES.HR];

export const ROLE_LABELS = {
  admin: 'Administrator',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

export const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export const LEAVE_TYPE_LABELS = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  unpaid: 'Unpaid Leave',
};

export const LEAVE_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const TASK_PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
export const TASK_STATUS_LABELS = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };

export const EMPLOYEE_STATUS_LABELS = {
  active: 'Active',
  probation: 'Probation',
  'on-leave': 'On Leave',
  inactive: 'Inactive',
};

export const EMPLOYMENT_TYPE_LABELS = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
  intern: 'Intern',
};

export const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  'prefer-not-to-say': 'Prefer not to say',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Present',
  late: 'Late',
  'half-day': 'Half Day',
};

export const VERIFICATION_LABELS = {
  verified: 'Verified',
  flagged: 'Flagged',
  manual: 'Manual',
};

export const AUDIT_ACTION_LABELS = {
  CHECK_IN_ATTEMPT: 'Check-in attempt',
  CHECK_IN_SUCCESS: 'Checked in',
  CHECK_IN_REJECTED: 'Check-in rejected',
  CHECK_OUT_ATTEMPT: 'Check-out attempt',
  CHECK_OUT_SUCCESS: 'Checked out',
  CHECK_OUT_REJECTED: 'Check-out rejected',
  GEOFENCE_VALIDATION_FAILED: 'Location failed',
  QR_VALIDATION_FAILED: 'QR failed',
  MANUAL_CREATE: 'Manual record',
  MANUAL_CORRECTION: 'Manual correction',
  OFFICE_CREATED: 'Office created',
  OFFICE_UPDATED: 'Office updated',
};

export const AUDIT_ACTION_TONES = {
  CHECK_IN_ATTEMPT: 'neutral',
  CHECK_OUT_ATTEMPT: 'neutral',
  CHECK_IN_SUCCESS: 'success',
  CHECK_OUT_SUCCESS: 'success',
  CHECK_IN_REJECTED: 'danger',
  CHECK_OUT_REJECTED: 'danger',
  GEOFENCE_VALIDATION_FAILED: 'danger',
  QR_VALIDATION_FAILED: 'danger',
  MANUAL_CREATE: 'warning',
  MANUAL_CORRECTION: 'warning',
  OFFICE_CREATED: 'info',
  OFFICE_UPDATED: 'info',
};

/** Why an attempt failed or was flagged, in words HR can act on. */
export const ATTENDANCE_REASON_LABELS = {
  GEOFENCE_OUTSIDE: 'Outside the office geofence',
  GEOFENCE_BOUNDARY: 'On the geofence edge (within GPS error)',
  GPS_MISSING: 'No GPS data sent',
  GPS_INVALID: 'Invalid GPS data',
  GPS_LOW_ACCURACY: 'GPS accuracy too low',
  QR_MISSING: 'No QR code scanned',
  QR_INVALID: 'Invalid or forged QR code',
  QR_EXPIRED: 'Expired QR code',
  QR_USED: 'QR code already used',
  QR_WRONG_OFFICE: 'QR code from another office',
  VERIFICATION_INVALID: 'Invalid verification session',
  VERIFICATION_EXPIRED: 'Location check expired',
  DUPLICATE_REQUEST: 'Duplicate request',
  ALREADY_CHECKED_IN: 'Already checked in',
  ACTIVE_SESSION_EXISTS: 'Previous session still open',
  ALREADY_CHECKED_OUT: 'Already checked out',
  NO_ACTIVE_CHECK_IN: 'No active check-in',
  ON_LEAVE: 'On approved leave',
  EMPLOYEE_INACTIVE: 'Employee profile inactive',
  NO_OFFICE_CONFIGURED: 'No office configured',
  SERVER_ERROR: 'Server error',
  MANUAL: 'Changed by admin/HR',
  SUSPECT_MOCK_LOCATION: 'Suspiciously precise GPS (possible mock location)',
  DEVICE_CLOCK_SKEW: 'Device clock differs from server',
  SHARED_DEVICE: 'Device used by another employee today',
};

export const DOCUMENT_TYPE_LABELS = {
  resume: 'Resume',
  'id-proof': 'ID Proof',
  'salary-slip': 'Salary Slip',
  other: 'Other',
};

/** Colour tone for every status value used across the app. */
export const STATUS_TONES = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  present: 'success',
  verified: 'success',
  low: 'neutral',
  flagged: 'warning',
  manual: 'info',

  pending: 'warning',
  probation: 'warning',
  late: 'warning',
  'half-day': 'warning',
  medium: 'warning',
  'in-progress': 'info',
  'on-leave': 'info',

  inactive: 'danger',
  rejected: 'danger',
  absent: 'danger',
  high: 'danger',
  overdue: 'danger',

  cancelled: 'neutral',
};

export const PASSWORD_RULES = [
  { key: 'length', label: '8–20 characters', test: (v) => v.length >= 8 && v.length <= 20 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'One special character (@$!%*?&)', test: (v) => /[@$!%*?&]/.test(v) },
];

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
