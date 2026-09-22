const Leave = require('../models/leave')
const User = require('../models/user')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const { sendSuccess, getPagination, escapeRegex } = require('../utils/apiResponse')
const { startOfDay, countWorkingDays } = require('../utils/dates')
const { notifyUsers, notifyRoles } = require('../services/notification')
const cache = require('../services/cache')
const { MANAGEMENT_ROLES, ROLES } = require('../config/constants')

const PAID_TYPES = ['casual', 'sick', 'earned']
const LEAVE_LABELS = { casual: 'Casual', sick: 'Sick', earned: 'Earned', unpaid: 'Unpaid' }

const populateLeave = (query) => query
    .populate('user', 'name email avatar role')
    .populate('reviewedBy', 'name')

const formatRange = (leave) => {
    const opts = { day: 'numeric', month: 'short' }
    const start = new Date(leave.startDate).toLocaleDateString('en-IN', opts)
    const end = new Date(leave.endDate).toLocaleDateString('en-IN', opts)
    return start === end ? start : `${start} – ${end}`
}

const statusCounts = async (match) => {
    const rows = await Leave.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    const counts = { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    rows.forEach((row) => { counts[row._id] = row.count })
    return counts
}

const applyLeave = async (req, res) => {
    const { leaveType, reason } = req.body
    const startDate = startOfDay(req.body.startDate)
    const endDate = startOfDay(req.body.endDate)
    const days = countWorkingDays(startDate, endDate)
    if (!days) throw new AppError('The selected range has no working days', 400)

    const overlapping = await Leave.exists({
        user: req.user._id,
        status: { $in: ['pending', 'approved'] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
    })
    if (overlapping) throw new AppError('You already have a leave request overlapping these dates', 409)

    if (PAID_TYPES.includes(leaveType)) {
        // Pending requests reserve balance so it cannot be over-committed
        const [pending] = await Leave.aggregate([
            { $match: { user: req.user._id, leaveType, status: 'pending' } },
            { $group: { _id: null, days: { $sum: '$days' } } }
        ])
        const available = req.user.leaveBalance[leaveType] - (pending?.days || 0)
        if (days > available) {
            throw new AppError(`Insufficient ${LEAVE_LABELS[leaveType].toLowerCase()} leave balance (${available} day(s) available)`, 400)
        }
    }

    const leave = await Leave.create({ user: req.user._id, leaveType, startDate, endDate, days, reason: reason.trim() })

    await notifyRoles(MANAGEMENT_ROLES, {
        title: 'New leave request',
        message: `${req.user.name} requested ${days} day(s) of ${LEAVE_LABELS[leaveType].toLowerCase()} leave (${formatRange(leave)}).`,
        type: 'leave',
        link: `/leaves/${leave._id}`
    }, { excludeUserId: req.user._id })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { statusCode: 201, message: 'Leave application submitted', data: leave })
}

const getLeaves = async (req, res) => {
    const { status, leaveType, userId, search } = req.query
    const { skip, limit, buildMeta } = getPagination(req.query)

    const filter = {}
    if (status) filter.status = status
    if (leaveType) filter.leaveType = leaveType
    if (userId) filter.user = userId
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).select('_id').lean()
        filter.user = { $in: users.map((u) => u._id) }
    }

    const [leaves, total, counts] = await Promise.all([
        populateLeave(Leave.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)).lean(),
        Leave.countDocuments(filter),
        statusCounts({})
    ])

    return sendSuccess(res, { data: leaves, meta: { ...buildMeta(total), counts } })
}

const getMyLeaves = async (req, res) => {
    const { skip, limit, buildMeta } = getPagination(req.query)
    const filter = { user: req.user._id }
    if (req.query.status) filter.status = req.query.status

    const [leaves, total, counts] = await Promise.all([
        populateLeave(Leave.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)).lean(),
        Leave.countDocuments(filter),
        statusCounts({ user: req.user._id })
    ])

    return sendSuccess(res, { data: leaves, meta: { ...buildMeta(total), counts, balance: req.user.leaveBalance } })
}

const getLeaveById = async (req, res) => {
    const leave = await populateLeave(Leave.findById(req.params.id)).lean()
    if (!leave) throw new AppError('Leave request not found', 404)

    const isOwner = String(leave.user?._id) === String(req.user._id)
    if (!isOwner && !MANAGEMENT_ROLES.includes(req.user.role)) {
        throw new AppError('You can only view your own leave requests', 403)
    }

    const [employee, applicant] = await Promise.all([
        Employee.findOne({ user: leave.user?._id }).select('employeeId department designation').populate('department', 'name').populate('designation', 'title').lean(),
        User.findById(leave.user?._id).select('leaveBalance').lean()
    ])

    return sendSuccess(res, { data: { ...leave, employee, balance: applicant?.leaveBalance } })
}

const loadPendingForReview = async (req) => {
    const leave = await Leave.findById(req.params.id)
    if (!leave) throw new AppError('Leave request not found', 404)
    if (leave.status !== 'pending') throw new AppError(`This request has already been ${leave.status}`, 409)
    if (leave.user.equals(req.user._id) && req.user.role !== ROLES.ADMIN) {
        throw new AppError('You cannot review your own leave request', 403)
    }
    return leave
}

const approveLeave = async (req, res) => {
    const leave = await loadPendingForReview(req)

    if (PAID_TYPES.includes(leave.leaveType)) {
        const balanceKey = `leaveBalance.${leave.leaveType}`
        // Conditional atomic decrement: balance can never go negative
        const result = await User.updateOne(
            { _id: leave.user, [balanceKey]: { $gte: leave.days } },
            { $inc: { [balanceKey]: -leave.days } }
        )
        if (!result.modifiedCount) throw new AppError('Employee does not have enough leave balance', 400)
    }

    Object.assign(leave, { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body?.note })
    await leave.save()

    await notifyUsers([leave.user], {
        title: 'Leave approved',
        message: `Your ${LEAVE_LABELS[leave.leaveType].toLowerCase()} leave (${formatRange(leave)}) was approved by ${req.user.name}.`,
        type: 'leave',
        link: `/leaves/${leave._id}`
    })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { message: 'Leave approved', data: leave })
}

const rejectLeave = async (req, res) => {
    const leave = await loadPendingForReview(req)

    Object.assign(leave, { status: 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body?.note })
    await leave.save()

    await notifyUsers([leave.user], {
        title: 'Leave rejected',
        message: `Your ${LEAVE_LABELS[leave.leaveType].toLowerCase()} leave (${formatRange(leave)}) was rejected${leave.reviewNote ? `: ${leave.reviewNote}` : '.'}`,
        type: 'leave',
        link: `/leaves/${leave._id}`
    })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { message: 'Leave rejected', data: leave })
}

const cancelLeave = async (req, res) => {
    const leave = await Leave.findById(req.params.id)
    if (!leave) throw new AppError('Leave request not found', 404)
    if (!leave.user.equals(req.user._id)) throw new AppError('You can only cancel your own leave requests', 403)

    if (leave.status === 'approved') {
        if (leave.startDate <= startOfDay()) throw new AppError('Leave that has already started cannot be cancelled', 400)
        if (PAID_TYPES.includes(leave.leaveType)) {
            await User.updateOne({ _id: leave.user }, { $inc: { [`leaveBalance.${leave.leaveType}`]: leave.days } })
        }
    } else if (leave.status !== 'pending') {
        throw new AppError(`A ${leave.status} request cannot be cancelled`, 409)
    }

    leave.status = 'cancelled'
    await leave.save()
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { message: 'Leave cancelled', data: leave })
}

module.exports = { applyLeave, getLeaves, getMyLeaves, getLeaveById, approveLeave, rejectLeave, cancelLeave }
