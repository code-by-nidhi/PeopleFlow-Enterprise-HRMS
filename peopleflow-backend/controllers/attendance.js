const mongoose = require('mongoose')
const Attendance = require('../models/attendance')
const AttendanceAuditLog = require('../models/attendanceAuditLog')
const Employee = require('../models/employee')
const Office = require('../models/office')
const User = require('../models/user')
const Leave = require('../models/leave')
const AppError = require('../utils/AppError')
const { sendSuccess, getPagination, escapeRegex } = require('../utils/apiResponse')
const { startOfDay, addDays, isValidDate, attendanceDay, isAfterLocalTime } = require('../utils/dates')
const cache = require('../services/cache')
const { verifyLocation: verifyLocationStep, completeAction, redactAttendance } = require('../services/attendanceVerification')
const { requestContext, recordAudit } = require('../services/attendanceAudit')
const { notifyUsers } = require('../services/notification')
const {
    OFFICE_START, MANAGEMENT_ROLES, ROLES, ATTENDANCE_SECURITY, AUDIT_ACTIONS, FAILED_AUDIT_ACTIONS
} = require('../config/constants')

const DEFAULT_CORRECTION_ROLES = [ROLES.ADMIN, ROLES.HR]
const serverTimeZone = () => process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone

/** Builds a { date } filter from ?date or ?from/?to. */
const dateRangeFilter = ({ date, from, to }) => {
    if (isValidDate(date)) {
        const day = startOfDay(date)
        return { $gte: day, $lt: addDays(day, 1) }
    }
    const range = {}
    if (isValidDate(from)) range.$gte = startOfDay(from)
    if (isValidDate(to)) range.$lt = addDays(startOfDay(to), 1)
    return Object.keys(range).length ? range : null
}

// ---------------------------------------------------------------------------
// Verified check-in / check-out
// ---------------------------------------------------------------------------

/** Step 1: the server checks the GPS fix against the office geofence. */
const verifyLocation = async (req, res) => {
    const data = await verifyLocationStep(req)
    return sendSuccess(res, { statusCode: 201, message: 'You are inside the office. Please scan the office QR code.', data })
}

const completeHandler = (action, message) => async (req, res) => {
    const { record, replayed } = await completeAction(req, action)
    return sendSuccess(res, {
        statusCode: replayed ? 200 : 201,
        message,
        data: redactAttendance(record, req.user.role),
        meta: { replayed, serverTime: new Date() }
    })
}

/** Step 2: office QR + server timestamp. Body: { verificationId, qrCode } */
const checkIn = completeHandler('check-in', 'Checked in successfully')
const checkOut = completeHandler('check-out', 'Checked out successfully')

/** Current attendance state for the signed-in user. */
const getToday = async (req, res) => {
    const now = new Date()
    const offices = await Office.find({ isActive: true }).select('rules.maxShiftHours').lean()
    const maxShiftHours = Math.max(ATTENDANCE_SECURITY.DEFAULTS.maxShiftHours, ...offices.map((o) => o.rules?.maxShiftHours || 0))

    const [openSession, todayRecord] = await Promise.all([
        Attendance.findOne({ user: req.user._id, checkOut: null, checkIn: { $gte: new Date(now.getTime() - maxShiftHours * 36e5) } })
            .sort({ checkIn: -1 }).populate('office', 'name code').lean(),
        Attendance.findOne({ user: req.user._id, date: startOfDay(now) }).populate('office', 'name code').lean()
    ])
    const record = openSession || todayRecord

    return sendSuccess(res, {
        data: {
            record: redactAttendance(record, req.user.role),
            canCheckIn: !record,
            canCheckOut: Boolean(openSession),
            attendanceConfigured: offices.length > 0,
            serverTime: now
        }
    })
}

// ---------------------------------------------------------------------------
// Attendance lists
// ---------------------------------------------------------------------------

const listAttendance = async (filter, query, role) => {
    const { skip, limit, buildMeta } = getPagination(query, 15)
    const [records, total] = await Promise.all([
        Attendance.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email avatar role')
            .populate('office', 'name code')
            .lean(),
        Attendance.countDocuments(filter)
    ])
    return { records: records.map((r) => redactAttendance(r, role)), meta: buildMeta(total) }
}

const summarise = async (userId, from, to) => {
    const rows = await Attendance.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(String(userId)), date: { $gte: from, $lt: to } } },
        { $group: { _id: '$status', count: { $sum: 1 }, hours: { $sum: '$workingHours' } } }
    ])
    const summary = { present: 0, late: 0, 'half-day': 0, totalHours: 0 }
    rows.forEach((row) => {
        summary[row._id] = row.count
        summary.totalHours += row.hours
    })
    summary.totalHours = Math.round(summary.totalHours * 100) / 100
    summary.daysAttended = summary.present + summary.late + summary['half-day']
    return summary
}

const getMyAttendance = async (req, res) => {
    const filter = { user: req.user._id }
    const range = dateRangeFilter(req.query)
    if (range) filter.date = range

    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [{ records, meta }, today, monthSummary] = await Promise.all([
        listAttendance(filter, req.query, req.user.role),
        Attendance.findOne({ user: req.user._id, date: startOfDay() }).lean(),
        summarise(req.user._id, monthStart, addDays(startOfDay(), 1))
    ])

    return sendSuccess(res, { data: records, meta: { ...meta, today: redactAttendance(today, req.user.role), monthSummary } })
}

const getAttendance = async (req, res) => {
    const { status, userId, search, verification } = req.query
    const filter = {}
    const range = dateRangeFilter(req.query)
    if (range) filter.date = range
    if (status) filter.status = String(status)
    if (userId && mongoose.isValidObjectId(userId)) filter.user = String(userId)
    if (['verified', 'flagged', 'manual'].includes(verification)) filter['checkInVerification.status'] = verification
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').lean()
        filter.user = { $in: users.map((u) => u._id) }
    }

    // Day summary for the selected date (defaults to today)
    const day = startOfDay(isValidDate(req.query.date) ? req.query.date : new Date())
    const [{ records, meta }, dayCounts, onLeave, headcount] = await Promise.all([
        listAttendance(filter, req.query, req.user.role),
        Attendance.aggregate([
            { $match: { date: day } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Leave.countDocuments({ status: 'approved', startDate: { $lte: day }, endDate: { $gte: day } }),
        User.countDocuments({ isActive: true, role: { $ne: ROLES.ADMIN }, createdAt: { $lt: addDays(day, 1) } })
    ])

    const counts = Object.fromEntries(dayCounts.map((row) => [row._id, row.count]))
    const checkedIn = (counts.present || 0) + (counts.late || 0) + (counts['half-day'] || 0)
    const daySummary = {
        date: day,
        present: checkedIn,
        late: counts.late || 0,
        halfDay: counts['half-day'] || 0,
        onLeave,
        absent: Math.max(headcount - checkedIn - onLeave, 0),
        headcount
    }

    return sendSuccess(res, { data: records, meta: { ...meta, daySummary } })
}

/** Accepts either an Employee _id or a User _id so links from both modules work. */
const getEmployeeAttendance = async (req, res) => {
    const { employeeId } = req.params
    if (!mongoose.Types.ObjectId.isValid(employeeId)) throw new AppError('Invalid employee id', 400)

    const employee = await Employee.findOne({ $or: [{ _id: employeeId }, { user: employeeId }] })
        .select('employeeId firstName lastName user department designation')
        .populate('department', 'name')
        .populate('designation', 'title')
        .lean()
    const userId = employee ? employee.user : employeeId

    const isSelf = String(userId) === String(req.user._id)
    if (!isSelf && !MANAGEMENT_ROLES.includes(req.user.role)) {
        throw new AppError('You can only view your own attendance', 403)
    }

    const user = await User.findById(userId).select('name email avatar role').lean()
    if (!user) throw new AppError('Employee not found', 404)

    const filter = { user: userId }
    const range = dateRangeFilter(req.query)
    if (range) filter.date = range

    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [{ records, meta }, monthSummary] = await Promise.all([
        listAttendance(filter, req.query, req.user.role),
        summarise(userId, monthStart, addDays(startOfDay(), 1))
    ])

    return sendSuccess(res, { data: records, meta: { ...meta, user, employee, monthSummary } })
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

const getAuditLog = async (req, res) => {
    const { action, failed, userId, officeId, reason, search, from, to } = req.query
    const filter = {}
    if (failed === 'true') filter.action = { $in: FAILED_AUDIT_ACTIONS }
    else if (Object.values(AUDIT_ACTIONS).includes(action)) filter.action = action
    if (userId && mongoose.isValidObjectId(userId)) filter.user = String(userId)
    if (officeId && mongoose.isValidObjectId(officeId)) filter.office = String(officeId)
    if (typeof reason === 'string' && reason) filter.reason = reason

    const range = {}
    if (isValidDate(from)) range.$gte = startOfDay(from)
    if (isValidDate(to)) range.$lt = addDays(startOfDay(to), 1)
    if (Object.keys(range).length) filter.createdAt = range

    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').lean()
        filter.user = { $in: users.map((u) => u._id) }
    }

    const { skip, limit, buildMeta } = getPagination(req.query, 20)
    const [entries, total] = await Promise.all([
        AttendanceAuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email avatar role')
            .populate('performedBy', 'name role')
            .populate('office', 'name code')
            .lean(),
        AttendanceAuditLog.countDocuments(filter)
    ])

    return sendSuccess(res, { data: entries, meta: buildMeta(total) })
}

// ---------------------------------------------------------------------------
// Manual corrections (the only way attendance is recorded without GPS + QR)
// ---------------------------------------------------------------------------

const canCorrect = (actor, office) =>
    actor.role === ROLES.ADMIN || (office?.correctionRoles || DEFAULT_CORRECTION_ROLES).includes(actor.role)

const snapshot = (record) => ({
    checkIn: record.checkIn || null,
    checkOut: record.checkOut || null,
    status: record.status,
    workingHours: record.workingHours
})

const hoursBetween = (from, to) => Math.round(((to - from) / 36e5) * 100) / 100

const deriveStatus = (record, office) => {
    const halfDayHours = office?.rules?.halfDayHours || ATTENDANCE_SECURITY.DEFAULTS.halfDayHours
    if (record.checkOut && record.workingHours < halfDayHours) return 'half-day'
    const officeStart = office?.rules?.officeStart || OFFICE_START
    return isAfterLocalTime(record.checkIn, officeStart, office?.timezone || serverTimeZone()) ? 'late' : 'present'
}

const MANUAL_PROOF = { status: 'manual', method: 'manual' }

const correctAttendance = async (req, res) => {
    const record = await Attendance.findById(req.params.id)
    if (!record) throw new AppError('Attendance record not found', 404)
    // Nobody corrects their own attendance
    if (String(record.user) === String(req.user._id)) throw new AppError('You cannot correct your own attendance', 403)

    const office = record.office ? await Office.findById(record.office).lean() : null
    if (!canCorrect(req.user, office)) throw new AppError('You do not have permission to correct attendance for this office', 403)

    const { checkIn, checkOut, status } = req.body
    const reason = String(req.body.reason).trim()
    const before = snapshot(record)

    if (checkIn !== undefined) record.checkIn = new Date(checkIn)
    if (checkOut !== undefined) record.checkOut = checkOut === null ? undefined : new Date(checkOut)
    if (record.checkOut && record.checkOut <= record.checkIn) throw new AppError('Check-out must be after check-in', 400)

    const timeZone = office?.timezone || serverTimeZone()
    if (attendanceDay(record.checkIn, timeZone).getTime() !== new Date(record.date).getTime()) {
        throw new AppError('Check-in must stay on the same day as this record', 400)
    }

    record.workingHours = record.checkOut ? hoursBetween(record.checkIn, record.checkOut) : 0
    record.status = status || deriveStatus(record, office)

    if (checkIn !== undefined) record.checkInVerification = { ...MANUAL_PROOF }
    if (checkOut !== undefined) {
        record.checkOutVerification = record.checkOut ? { ...MANUAL_PROOF } : undefined
        if (!record.checkOut) record.checkOutLocation = undefined
    }

    const after = snapshot(record)
    record.corrections.push({ by: req.user._id, at: new Date(), reason, before, after })
    await record.save()

    await recordAudit({
        user: record.user,
        performedBy: req.user._id,
        attendance: record._id,
        office: record.office,
        action: AUDIT_ACTIONS.MANUAL_CORRECTION,
        reason: 'MANUAL',
        ...requestContext(req),
        metadata: { reason, before, after }
    })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)
    await notifyUsers([record.user], {
        title: 'Attendance corrected',
        message: `${req.user.name} updated your attendance. Reason: ${reason}`,
        type: 'attendance',
        link: '/attendance/my'
    })

    return sendSuccess(res, { message: 'Attendance corrected', data: record })
}

/** Creates a record for a day with no verified check-in (e.g. a phone failure). */
const createManualAttendance = async (req, res) => {
    const { userId, officeId, checkIn, checkOut, status } = req.body
    const reason = String(req.body.reason).trim()
    if (String(userId) === String(req.user._id)) throw new AppError('You cannot add attendance for yourself', 403)

    const [target, office] = await Promise.all([
        User.findById(userId).select('name role').lean(),
        officeId ? Office.findById(officeId).lean() : null
    ])
    if (!target || target.role === ROLES.ADMIN) throw new AppError('Employee not found', 404)
    if (officeId && !office) throw new AppError('Office not found', 404)
    if (!canCorrect(req.user, office)) throw new AppError('You do not have permission to add attendance for this office', 403)

    const checkInAt = new Date(checkIn)
    const checkOutAt = checkOut ? new Date(checkOut) : undefined
    if (checkOutAt && checkOutAt <= checkInAt) throw new AppError('Check-out must be after check-in', 400)

    const record = new Attendance({
        user: target._id,
        office: office?._id,
        date: attendanceDay(checkInAt, office?.timezone || serverTimeZone()),
        checkIn: checkInAt,
        checkOut: checkOutAt,
        workingHours: checkOutAt ? hoursBetween(checkInAt, checkOutAt) : 0,
        checkInVerification: { ...MANUAL_PROOF },
        checkOutVerification: checkOutAt ? { ...MANUAL_PROOF } : undefined,
        note: reason
    })
    record.status = status || deriveStatus(record, office)
    record.corrections = [{ by: req.user._id, at: new Date(), reason, before: null, after: snapshot(record) }]

    try {
        await record.save()
    } catch (error) {
        if (error.code === 11000) throw new AppError('An attendance record already exists for that day. Correct it instead.', 409)
        throw error
    }

    await recordAudit({
        user: target._id,
        performedBy: req.user._id,
        attendance: record._id,
        office: office?._id,
        action: AUDIT_ACTIONS.MANUAL_CREATE,
        reason: 'MANUAL',
        ...requestContext(req),
        metadata: { reason, after: snapshot(record) }
    })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)
    await notifyUsers([target._id], {
        title: 'Attendance added',
        message: `${req.user.name} added an attendance record for you. Reason: ${reason}`,
        type: 'attendance',
        link: '/attendance/my'
    })

    return sendSuccess(res, { statusCode: 201, message: 'Attendance recorded', data: record })
}

module.exports = {
    verifyLocation,
    checkIn,
    checkOut,
    getToday,
    getMyAttendance,
    getAttendance,
    getEmployeeAttendance,
    getAuditLog,
    correctAttendance,
    createManualAttendance
}
