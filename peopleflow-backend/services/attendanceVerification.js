/**
 * Verified check-in / check-out.
 *
 * A valid attendance event needs ALL of:
 *   1. an authenticated, active employee (verifyJWT + profile status)
 *   2. a fresh GPS fix inside an active office geofence (computed here, never trusted from the client)
 *   3. a single-use, short-lived QR token issued by that office's kiosk
 *   4. a timestamp taken from the server clock at the moment of recording
 *
 * Step 1+2 happen in verifyLocation(), which returns a short-lived verification id.
 * Step 3+4 happen in completeAction(), which consumes that id exactly once.
 */
const mongoose = require('mongoose')
const Attendance = require('../models/attendance')
const AttendanceVerification = require('../models/attendanceVerification')
const Office = require('../models/office')
const Employee = require('../models/employee')
const Leave = require('../models/leave')
const AppError = require('../utils/AppError')
const { evaluateGeofence, roundCoordinate } = require('../utils/geo')
const { attendanceDay, isAfterLocalTime } = require('../utils/dates')
const { consumeQrToken } = require('./officeQr')
const { requestContext, recordAudit } = require('./attendanceAudit')
const { notifyRoles } = require('./notification')
const cache = require('./cache')
const { ATTENDANCE_ACTIONS, ATTENDANCE_ADMIN_ROLES, ATTENDANCE_SECURITY, AUDIT_ACTIONS, ROLES } = require('../config/constants')

const { VERIFICATION_WINDOW_MS, SUSPICIOUS_ACCURACY_METERS, CLOCK_SKEW_FLAG_MS, COORDINATE_DECIMALS } = ATTENDANCE_SECURITY

// User-facing messages are deliberately free of thresholds, distances and internals
const REJECTIONS = {
    EMPLOYEE_INACTIVE: ['Your employee profile is inactive. Please contact HR.', 403],
    NO_OFFICE_CONFIGURED: ['Attendance locations have not been set up yet. Please contact HR.', 409],
    GPS_MISSING: ['We could not read your location. Turn on location services and try again.', 400],
    GPS_INVALID: ['We could not read a valid location from your device. Please try again.', 400],
    GPS_LOW_ACCURACY: ['Your location is not precise enough to confirm you are in the office. Turn on precise location, wait a few seconds and try again.', 400],
    GEOFENCE_OUTSIDE: ['You appear to be outside the office location. Please move inside the office and try again.', 403],
    GEOFENCE_BOUNDARY: ['You seem to be at the edge of the office area. Please move further inside the office and try again.', 403],
    VERIFICATION_INVALID: ['This attendance session is not valid. Please start again.', 400],
    VERIFICATION_EXPIRED: ['Your location check has expired. Please start again.', 400],
    DUPLICATE_REQUEST: ['Your request is already being processed.', 409],
    ALREADY_CHECKED_IN: ['You have already checked in today.', 409],
    ACTIVE_SESSION_EXISTS: ['You still have an open check-in. Please check out first.', 409],
    ALREADY_CHECKED_OUT: ['You have already checked out today.', 409],
    NO_ACTIVE_CHECK_IN: ['You have not checked in today, so there is nothing to check out from.', 409],
    ON_LEAVE: ['You are on approved leave today.', 400]
}

const LOCATION_REASONS = new Set(['GPS_MISSING', 'GPS_INVALID', 'GPS_LOW_ACCURACY', 'GEOFENCE_OUTSIDE', 'GEOFENCE_BOUNDARY'])

const AUDIT = {
    'check-in': { attempt: AUDIT_ACTIONS.CHECK_IN_ATTEMPT, success: AUDIT_ACTIONS.CHECK_IN_SUCCESS, rejected: AUDIT_ACTIONS.CHECK_IN_REJECTED },
    'check-out': { attempt: AUDIT_ACTIONS.CHECK_OUT_ATTEMPT, success: AUDIT_ACTIONS.CHECK_OUT_SUCCESS, rejected: AUDIT_ACTIONS.CHECK_OUT_REJECTED }
}

const failureAuditAction = (action, reason) => {
    if (LOCATION_REASONS.has(reason)) return AUDIT_ACTIONS.GEOFENCE_VALIDATION_FAILED
    if (reason && reason.startsWith('QR_')) return AUDIT_ACTIONS.QR_VALIDATION_FAILED
    return AUDIT[action].rejected
}

const auditFailure = (reason, { action, user, ctx, office, verification, location, metadata }) => recordAudit({
    user: user._id,
    performedBy: user._id,
    action: failureAuditAction(action, reason),
    reason,
    office: office?._id,
    verification: verification?._id,
    location,
    ...ctx,
    metadata: { attendanceAction: action, ...metadata }
})

/** Logs the failed attempt and returns the error to throw. */
const rejection = async (reason, detail) => {
    await auditFailure(reason, detail)
    const [message, status] = REJECTIONS[reason]
    const error = new AppError(message, status, reason)
    error.audited = true
    return error
}

/** Only real, in-range numbers are accepted; strings or booleans from a tampered payload are not. */
const readLocation = ({ latitude, longitude, accuracy }) => {
    const values = [latitude, longitude, accuracy]
    if (values.some((v) => v === undefined || v === null || v === '')) return { reason: 'GPS_MISSING' }
    if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) return { reason: 'GPS_INVALID' }
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy <= 0) return { reason: 'GPS_INVALID' }
    return { latitude, longitude, accuracy }
}

const storedLocation = ({ latitude, longitude, accuracy }, distance) => ({
    latitude: roundCoordinate(latitude, COORDINATE_DECIMALS),
    longitude: roundCoordinate(longitude, COORDINATE_DECIMALS),
    accuracy: Math.round(accuracy),
    distance
})

const isEmployeeInactive = async (userId) => {
    const employee = await Employee.findOne({ user: userId }).select('status').lean()
    return employee?.status === 'inactive'
}

/**
 * Server-side view of what the employee may do right now. Returns { reason } when
 * the action is not allowed, otherwise the open session (for check-out).
 */
const assessState = async (action, userId, office, now) => {
    const day = attendanceDay(now, office.timezone)
    const shiftStart = new Date(now.getTime() - office.rules.maxShiftHours * 36e5)
    const openSession = await Attendance.findOne({ user: userId, checkOut: null, checkIn: { $gte: shiftStart } }).sort({ checkIn: -1 })

    if (action === 'check-in') {
        if (openSession) {
            return { reason: openSession.date.getTime() === day.getTime() ? 'ALREADY_CHECKED_IN' : 'ACTIVE_SESSION_EXISTS' }
        }
        const [today, onLeave] = await Promise.all([
            Attendance.exists({ user: userId, date: day }),
            Leave.exists({ user: userId, status: 'approved', startDate: { $lte: day }, endDate: { $gte: day } })
        ])
        if (today) return { reason: 'ALREADY_CHECKED_IN' }
        if (onLeave) return { reason: 'ON_LEAVE' }
        return {}
    }

    if (!openSession) {
        const today = await Attendance.findOne({ user: userId, date: day }).select('checkOut').lean()
        return { reason: today?.checkOut ? 'ALREADY_CHECKED_OUT' : 'NO_ACTIVE_CHECK_IN' }
    }
    return { openSession }
}

// Another employee already used this browser for attendance today: possible buddy punching
const isDeviceSharedToday = (deviceId, userId, day) => Attendance.exists({
    date: day,
    user: { $ne: userId },
    $or: [{ 'checkInVerification.deviceId': deviceId }, { 'checkOutVerification.deviceId': deviceId }]
})

/** Step 1: authenticate, validate GPS against the nearest office geofence, open a short verification window. */
const verifyLocation = async (req) => {
    const { user } = req
    const { action } = req.body
    if (!ATTENDANCE_ACTIONS.includes(action)) throw new AppError('Action must be check-in or check-out', 400)

    const ctx = requestContext(req)
    const base = { action, user, ctx }
    const input = readLocation(req.body)
    const now = new Date()

    // The device clock is recorded for review only; it never decides anything
    const clientTime = Number(req.body.capturedAt)
    const clockSkewMs = Number.isFinite(clientTime) && clientTime > 0 ? now.getTime() - clientTime : null

    await recordAudit({
        user: user._id,
        performedBy: user._id,
        action: AUDIT[action].attempt,
        ...ctx,
        location: input.reason ? undefined : storedLocation(input),
        metadata: { clockSkewMs }
    })

    if (await isEmployeeInactive(user._id)) throw await rejection('EMPLOYEE_INACTIVE', base)
    if (input.reason) throw await rejection(input.reason, base)

    const offices = await Office.find({ isActive: true })
    if (!offices.length) throw await rejection('NO_OFFICE_CONFIGURED', base)

    // The nearest active office is the one the employee is trying to attend
    const [nearest] = offices
        .map((office) => ({ office, ...evaluateGeofence(office, input) }))
        .sort((a, b) => a.distance - b.distance)
    const { office, distance } = nearest
    const location = storedLocation(input, distance)
    const detail = {
        ...base,
        office,
        location,
        metadata: { distance, radiusMeters: office.radiusMeters, accuracy: input.accuracy, maxAccuracyMeters: office.maxAccuracyMeters, clockSkewMs }
    }

    if (input.accuracy > office.maxAccuracyMeters) throw await rejection('GPS_LOW_ACCURACY', detail)
    if (nearest.status === 'outside') throw await rejection('GEOFENCE_OUTSIDE', detail)
    if (nearest.status === 'boundary') throw await rejection('GEOFENCE_BOUNDARY', detail)

    // Fail fast so nobody scans a QR code for an action that cannot succeed
    const state = await assessState(action, user._id, office, now)
    if (state.reason) throw await rejection(state.reason, detail)

    const flags = []
    if (input.accuracy < SUSPICIOUS_ACCURACY_METERS) flags.push('SUSPECT_MOCK_LOCATION')
    if (clockSkewMs !== null && Math.abs(clockSkewMs) > CLOCK_SKEW_FLAG_MS) flags.push('DEVICE_CLOCK_SKEW')

    const verification = await AttendanceVerification.create({
        user: user._id,
        action,
        office: office._id,
        location,
        flags,
        ...ctx,
        expiresAt: new Date(now.getTime() + VERIFICATION_WINDOW_MS)
    })

    return {
        verificationId: verification._id,
        action,
        office: { _id: office._id, name: office.name, code: office.code },
        expiresAt: verification.expiresAt
    }
}

const recordCheckIn = async ({ user, office, verification, proof, recordedAt }) => Attendance.create({
    user: user._id,
    office: office._id,
    date: attendanceDay(recordedAt, office.timezone),
    checkIn: recordedAt,
    status: isAfterLocalTime(recordedAt, office.rules.officeStart, office.timezone) ? 'late' : 'present',
    checkInLocation: verification.location,
    checkInVerification: proof
})

const recordCheckOut = async ({ office, verification, proof, recordedAt, openSession, detail }) => {
    const workingHours = Math.round(((recordedAt - openSession.checkIn) / 36e5) * 100) / 100
    const update = {
        checkOut: recordedAt,
        workingHours,
        checkOutLocation: verification.location,
        checkOutVerification: proof
    }
    if (workingHours < office.rules.halfDayHours) update.status = 'half-day'

    // `checkOut: null` in the filter makes a concurrent second check-out a no-op
    const record = await Attendance.findOneAndUpdate({ _id: openSession._id, checkOut: null }, { $set: update }, { returnDocument: 'after' })
    if (!record) throw await rejection('ALREADY_CHECKED_OUT', detail)
    return record
}

/**
 * Step 2: validate the office QR and record the event with a server timestamp.
 * The verification id is the idempotency key: repeating a completed request
 * returns the original record instead of creating another one.
 */
const completeAction = async (req, action) => {
    const { user } = req
    const ctx = requestContext(req)
    const base = { action, user, ctx }
    const { verificationId, qrCode } = req.body

    if (!mongoose.isValidObjectId(verificationId)) throw await rejection('VERIFICATION_INVALID', base)

    // Scoped to the signed-in user, so nobody can complete someone else's attempt
    const verification = await AttendanceVerification.findOne({ _id: verificationId, user: user._id })
    if (!verification || verification.action !== action) throw await rejection('VERIFICATION_INVALID', base)

    if (verification.status === 'completed' && verification.attendance) {
        const record = await Attendance.findById(verification.attendance)
        if (record) return { record, replayed: true }
    }

    const now = new Date()
    const verificationDetail = { ...base, verification, location: verification.location }
    if (verification.status === 'processing') throw await rejection('DUPLICATE_REQUEST', verificationDetail)
    if (verification.status !== 'pending' || verification.expiresAt <= now) throw await rejection('VERIFICATION_EXPIRED', verificationDetail)

    const office = await Office.findById(verification.office)
    if (!office || !office.isActive) throw await rejection('VERIFICATION_INVALID', verificationDetail)
    const detail = { ...verificationDetail, office }

    if (await isEmployeeInactive(user._id)) throw await rejection('EMPLOYEE_INACTIVE', detail)
    const state = await assessState(action, user._id, office, now)
    if (state.reason) throw await rejection(state.reason, detail)

    // Claim the attempt: of two concurrent requests (double click) only one gets past here
    const claimed = await AttendanceVerification.findOneAndUpdate(
        { _id: verification._id, status: 'pending', expiresAt: { $gt: now } },
        { $set: { status: 'processing' } },
        { returnDocument: 'after' }
    )
    if (!claimed) throw await rejection('DUPLICATE_REQUEST', detail)

    try {
        const qrToken = await consumeQrToken({ raw: qrCode, office, userId: user._id, action })

        const recordedAt = new Date() // the server clock is the only attendance clock
        const day = attendanceDay(recordedAt, office.timezone)
        const flags = [...claimed.flags]
        if (ctx.deviceId && await isDeviceSharedToday(ctx.deviceId, user._id, day)) flags.push('SHARED_DEVICE')

        const proof = {
            status: flags.length ? 'flagged' : 'verified',
            method: 'geofence+qr',
            flags,
            verification: claimed._id,
            qrToken: qrToken._id,
            deviceId: ctx.deviceId,
            ipAddress: ctx.ipAddress
        }
        const input = { user, office, verification: claimed, proof, recordedAt, openSession: state.openSession, detail }
        const record = action === 'check-in' ? await recordCheckIn(input) : await recordCheckOut(input)

        await AttendanceVerification.updateOne(
            { _id: claimed._id },
            { $set: { status: 'completed', completedAt: recordedAt, qrToken: qrToken._id, attendance: record._id, flags } }
        )
        await recordAudit({
            user: user._id,
            performedBy: user._id,
            action: AUDIT[action].success,
            attendance: record._id,
            office: office._id,
            verification: claimed._id,
            location: claimed.location,
            ...ctx,
            metadata: { flags, recordedAt }
        })
        await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

        if (flags.length) {
            notifyRoles(ATTENDANCE_ADMIN_ROLES, {
                title: 'Attendance flagged for review',
                message: `${user.name}'s ${action} at ${office.name} was recorded but flagged: ${flags.join(', ')}.`,
                type: 'attendance',
                link: '/attendance/audit'
            }).catch(() => {})
        }

        return { record, replayed: false }
    } catch (error) {
        const duplicate = error.code === 11000
        const reason = duplicate ? 'ALREADY_CHECKED_IN' : (typeof error.code === 'string' ? error.code : 'SERVER_ERROR')
        // A bad scan (expired / already used code) may be retried with the next code while the
        // location check is still fresh; anything else closes the attempt for good
        const rescannable = reason.startsWith('QR_')
        await AttendanceVerification.updateOne(
            { _id: claimed._id },
            { $set: rescannable ? { status: 'pending' } : { status: 'rejected', reason } }
        ).catch(() => {})

        // The unique (user, date) index stops a double check-in even under concurrency
        if (duplicate) throw await rejection('ALREADY_CHECKED_IN', detail)
        if (!error.audited) {
            await auditFailure(reason, { ...detail, metadata: reason === 'SERVER_ERROR' ? { error: error.message } : undefined })
        }
        throw error
    }
}

/**
 * Hides verification internals from people who do not need them. Admin/HR see
 * everything; managers see the outcome but not coordinates or device details;
 * employees see only how the record was verified, so fraud signals are not taught.
 */
const redactAttendance = (record, role) => {
    if (!record || ATTENDANCE_ADMIN_ROLES.includes(role)) return record
    const r = typeof record.toObject === 'function' ? record.toObject() : { ...record }

    for (const side of ['checkIn', 'checkOut']) {
        const location = r[`${side}Location`]
        const proof = r[`${side}Verification`]
        if (role === ROLES.MANAGER) {
            if (location) r[`${side}Location`] = { accuracy: location.accuracy, distance: location.distance }
            if (proof) r[`${side}Verification`] = { status: proof.status, method: proof.method, flags: proof.flags }
        } else {
            delete r[`${side}Location`]
            if (proof) r[`${side}Verification`] = { method: proof.method }
        }
    }
    if (r.corrections) r.corrections = r.corrections.map(({ at, reason }) => ({ at, reason }))
    return r
}

module.exports = { verifyLocation, completeAction, redactAttendance, readLocation, REJECTIONS }
