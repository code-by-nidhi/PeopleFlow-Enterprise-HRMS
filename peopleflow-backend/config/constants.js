const ROLES = Object.freeze({
    ADMIN: 'admin',
    HR: 'hr',
    MANAGER: 'manager',
    EMPLOYEE: 'employee'
})

const MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER]

const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid']

// Days granted per year for each paid leave type
const DEFAULT_LEAVE_BALANCE = { casual: 12, sick: 8, earned: 15 }

const TASK_PRIORITIES = ['low', 'medium', 'high']
const TASK_STATUSES = ['pending', 'in-progress', 'completed']

// Check-ins after this time (local server time, HH:MM) are marked late
const OFFICE_START = process.env.OFFICE_START || '09:30'

const CACHE_TTL = {
    DASHBOARD: 60,
    LISTS: 300
}

// Roles that record their own attendance (admins are not part of the headcount)
const ATTENDANCE_ROLES = [ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE]
// Roles that configure offices, run the QR kiosk and read the attendance audit log
const ATTENDANCE_ADMIN_ROLES = [ROLES.ADMIN, ROLES.HR]

const ATTENDANCE_ACTIONS = ['check-in', 'check-out']

/**
 * Verified attendance: every check-in/out needs an authenticated user, a fresh GPS
 * fix inside an office geofence and a single-use, short-lived office QR token.
 */
const ATTENDANCE_SECURITY = Object.freeze({
    // How long a successful location check stays valid while the employee scans the QR
    VERIFICATION_WINDOW_MS: 2 * 60 * 1000,
    // Readings claiming better accuracy than this are typical of mock-location apps
    SUSPICIOUS_ACCURACY_METERS: 3,
    // Client/server clock difference worth flagging for review (never trusted for time)
    CLOCK_SKEW_FLAG_MS: 5 * 60 * 1000,
    // Coordinates are stored to 5 decimals (~1 m); more precision is not needed
    COORDINATE_DECIMALS: 5,
    DEFAULTS: {
        radiusMeters: 100,
        qrTtlSeconds: 45,
        maxAccuracyMeters: 100,
        halfDayHours: 4,
        maxShiftHours: 16
    }
})

// Every event written to the attendance audit log
const AUDIT_ACTIONS = Object.freeze({
    CHECK_IN_ATTEMPT: 'CHECK_IN_ATTEMPT',
    CHECK_IN_SUCCESS: 'CHECK_IN_SUCCESS',
    CHECK_IN_REJECTED: 'CHECK_IN_REJECTED',
    CHECK_OUT_ATTEMPT: 'CHECK_OUT_ATTEMPT',
    CHECK_OUT_SUCCESS: 'CHECK_OUT_SUCCESS',
    CHECK_OUT_REJECTED: 'CHECK_OUT_REJECTED',
    GEOFENCE_VALIDATION_FAILED: 'GEOFENCE_VALIDATION_FAILED',
    QR_VALIDATION_FAILED: 'QR_VALIDATION_FAILED',
    MANUAL_CREATE: 'MANUAL_CREATE',
    MANUAL_CORRECTION: 'MANUAL_CORRECTION',
    OFFICE_CREATED: 'OFFICE_CREATED',
    OFFICE_UPDATED: 'OFFICE_UPDATED'
})

const FAILED_AUDIT_ACTIONS = [
    AUDIT_ACTIONS.CHECK_IN_REJECTED,
    AUDIT_ACTIONS.CHECK_OUT_REJECTED,
    AUDIT_ACTIONS.GEOFENCE_VALIDATION_FAILED,
    AUDIT_ACTIONS.QR_VALIDATION_FAILED
]

module.exports = {
    ROLES,
    MANAGEMENT_ROLES,
    LEAVE_TYPES,
    DEFAULT_LEAVE_BALANCE,
    TASK_PRIORITIES,
    TASK_STATUSES,
    OFFICE_START,
    CACHE_TTL,
    ATTENDANCE_ROLES,
    ATTENDANCE_ADMIN_ROLES,
    ATTENDANCE_ACTIONS,
    ATTENDANCE_SECURITY,
    AUDIT_ACTIONS,
    FAILED_AUDIT_ACTIONS
}
