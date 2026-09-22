const Employee = require('../models/employee')
const User = require('../models/user')
const Department = require('../models/department')
const Attendance = require('../models/attendance')
const Leave = require('../models/leave')
const Task = require('../models/task')
const { sendSuccess } = require('../utils/apiResponse')
const { startOfDay, addDays, countWorkingDays } = require('../utils/dates')
const cache = require('../services/cache')
const { ROLES, MANAGEMENT_ROLES, CACHE_TTL } = require('../config/constants')

const DAY_LABEL = (date) => date.toLocaleDateString('en-US', { weekday: 'short' })
const MONTH_LABEL = (date) => date.toLocaleDateString('en-US', { month: 'short' })

const monthStarts = (count) => {
    const now = new Date()
    return Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1))
}

const groupCounts = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]))

/** Days of [from, to) covered by any of the leaves. */
const leaveDaysByDate = (leaves, days) => days.map((day) =>
    leaves.filter((leave) => leave.startDate <= day && leave.endDate >= day).length
)

const buildManagementDashboard = async (role) => {
    const today = startOfDay()
    const tomorrow = addDays(today, 1)
    const weekStart = addDays(today, -6)
    const months = monthStarts(6)
    const sixMonthsAgo = months[0]
    const monthStart = months[months.length - 1]
    const last7Days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    const [
        totalEmployees,
        activeEmployees,
        departmentCount,
        todayStatus,
        weekAttendance,
        weekLeaves,
        pendingLeaves,
        departmentSplit,
        leavesByMonth,
        hiresByMonth,
        taskStatus,
        overdueTasks,
        newHiresThisMonth,
        pendingLeaveList,
        upcomingTasks,
        recentEmployees,
        usersByRole,
        trackedUsers
    ] = await Promise.all([
        Employee.countDocuments(),
        User.countDocuments({ isActive: true, role: { $ne: ROLES.ADMIN } }),
        Department.countDocuments(),
        Attendance.aggregate([{ $match: { date: today } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Attendance.aggregate([
            { $match: { date: { $gte: weekStart, $lt: tomorrow } } },
            { $group: { _id: '$date', count: { $sum: 1 }, late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } } } }
        ]),
        Leave.find({ status: 'approved', startDate: { $lt: tomorrow }, endDate: { $gte: weekStart } }).select('startDate endDate').lean(),
        Leave.countDocuments({ status: 'pending' }),
        Employee.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
            { $project: { count: 1, name: { $ifNull: [{ $arrayElemAt: ['$department.name', 0] }, 'Unassigned'] } } },
            { $sort: { count: -1 } }
        ]),
        Leave.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' }, status: '$status' }, count: { $sum: 1 } } }
        ]),
        Employee.aggregate([
            { $match: { joiningDate: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: '$joiningDate' }, year: { $year: '$joiningDate' } }, count: { $sum: 1 } } }
        ]),
        Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Task.countDocuments({ status: { $ne: 'completed' }, deadline: { $lt: today } }),
        Employee.countDocuments({ joiningDate: { $gte: monthStart } }),
        Leave.find({ status: 'pending' }).sort({ startDate: 1 }).limit(5).populate('user', 'name email avatar').lean(),
        Task.find({ status: { $ne: 'completed' } }).sort({ deadline: 1 }).limit(5).populate('assignedTo', 'name').lean(),
        Employee.find().sort({ createdAt: -1 }).limit(5).select('employeeId firstName lastName joiningDate department designation')
            .populate('department', 'name').populate('designation', 'title').lean(),
        role === ROLES.ADMIN ? User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]) : Promise.resolve([]),
        User.find({ isActive: true, role: { $ne: ROLES.ADMIN } }).select('createdAt').lean()
    ])

    // People only count as absent on days after their account existed
    const headcountOn = (day) => trackedUsers.filter((u) => u.createdAt < addDays(day, 1)).length

    const todayCounts = groupCounts(todayStatus)
    const presentToday = (todayCounts.present || 0) + (todayCounts.late || 0) + (todayCounts['half-day'] || 0)
    const onLeaveToday = leaveDaysByDate(weekLeaves, [today])[0]

    const attendanceByDay = new Map(weekAttendance.map((row) => [new Date(row._id).getTime(), row]))
    const onLeaveByDay = leaveDaysByDate(weekLeaves, last7Days)
    const attendanceTrend = {
        labels: last7Days.map(DAY_LABEL),
        present: last7Days.map((day) => (attendanceByDay.get(day.getTime())?.count || 0)),
        late: last7Days.map((day) => (attendanceByDay.get(day.getTime())?.late || 0)),
        onLeave: onLeaveByDay,
        absent: last7Days.map((day, i) => day.getDay() === 0 ? 0 : Math.max(headcountOn(day) - (attendanceByDay.get(day.getTime())?.count || 0) - onLeaveByDay[i], 0))
    }

    const monthKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}`
    const leaveMonthly = { approved: {}, pending: {}, rejected: {} }
    leavesByMonth.forEach(({ _id, count }) => {
        if (leaveMonthly[_id.status]) leaveMonthly[_id.status][`${_id.year}-${_id.month}`] = count
    })
    const hires = Object.fromEntries(hiresByMonth.map(({ _id, count }) => [`${_id.year}-${_id.month}`, count]))

    const tasks = groupCounts(taskStatus)

    return {
        role,
        stats: {
            totalEmployees,
            activeEmployees,
            departments: departmentCount,
            presentToday,
            lateToday: todayCounts.late || 0,
            onLeaveToday,
            absentToday: Math.max(activeEmployees - presentToday - onLeaveToday, 0),
            attendanceRate: activeEmployees ? Math.round((presentToday / activeEmployees) * 1000) / 10 : 0,
            pendingLeaves,
            activeTasks: (tasks.pending || 0) + (tasks['in-progress'] || 0),
            overdueTasks,
            newHiresThisMonth
        },
        attendanceTrend,
        departmentDistribution: departmentSplit.map(({ name, count }) => ({ label: name, value: count })),
        leaveTrend: {
            labels: months.map(MONTH_LABEL),
            approved: months.map((m) => leaveMonthly.approved[monthKey(m)] || 0),
            pending: months.map((m) => leaveMonthly.pending[monthKey(m)] || 0),
            rejected: months.map((m) => leaveMonthly.rejected[monthKey(m)] || 0)
        },
        hiringTrend: {
            labels: months.map(MONTH_LABEL),
            hires: months.map((m) => hires[monthKey(m)] || 0)
        },
        taskStatus: {
            pending: tasks.pending || 0,
            inProgress: tasks['in-progress'] || 0,
            completed: tasks.completed || 0,
            overdue: overdueTasks
        },
        pendingLeaves: pendingLeaveList,
        upcomingTasks,
        recentEmployees,
        usersByRole: groupCounts(usersByRole)
    }
}

const buildPersonalDashboard = async (user) => {
    const today = startOfDay()
    const tomorrow = addDays(today, 1)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    // Week starts on Monday
    const weekStart = addDays(today, -((today.getDay() + 6) % 7))
    const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i))
    const fourWeeksAgo = addDays(weekStart, -21)

    const [todayRecord, weekRecords, monthStatus, monthLeaves, leaveCounts, taskStatus, overdue, dueToday, upcomingTasks, recentLeaves, completedRecent] = await Promise.all([
        Attendance.findOne({ user: user._id, date: today }).lean(),
        Attendance.find({ user: user._id, date: { $gte: weekStart, $lt: addDays(weekStart, 7) } }).lean(),
        Attendance.aggregate([
            { $match: { user: user._id, date: { $gte: monthStart, $lt: tomorrow } } },
            { $group: { _id: '$status', count: { $sum: 1 }, hours: { $sum: '$workingHours' } } }
        ]),
        Leave.find({ user: user._id, status: 'approved', startDate: { $lt: tomorrow }, endDate: { $gte: monthStart } }).select('startDate endDate').lean(),
        Leave.aggregate([{ $match: { user: user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Task.aggregate([{ $match: { assignedTo: user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Task.countDocuments({ assignedTo: user._id, status: { $ne: 'completed' }, deadline: { $lt: today } }),
        Task.countDocuments({ assignedTo: user._id, status: { $ne: 'completed' }, deadline: { $gte: today, $lt: tomorrow } }),
        Task.find({ assignedTo: user._id, status: { $ne: 'completed' } }).sort({ deadline: 1 }).limit(5).lean(),
        Leave.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).lean(),
        Task.find({ assignedTo: user._id, status: 'completed', completedAt: { $gte: fourWeeksAgo } }).select('completedAt').lean()
    ])

    const hoursByDay = new Map(weekRecords.map((r) => [new Date(r.date).getTime(), r.workingHours || 0]))
    // Include today's in-progress shift so the chart is live
    if (todayRecord && !todayRecord.checkOut) {
        hoursByDay.set(today.getTime(), Math.round(((now - new Date(todayRecord.checkIn)) / 36e5) * 100) / 100)
    }
    const weeklyHours = weekDays.map((d) => Math.round((hoursByDay.get(d.getTime()) || 0) * 10) / 10)

    const status = groupCounts(monthStatus)
    const hoursThisMonth = monthStatus.reduce((sum, row) => sum + row.hours, 0)
    const daysAttended = (status.present || 0) + (status.late || 0) + (status['half-day'] || 0)
    // Attendance can only be tracked from the day the account was created
    const accountStart = startOfDay(user.createdAt)
    const trackingStart = accountStart > monthStart ? accountStart : monthStart
    const leaveDays = monthLeaves.reduce((sum, leave) => {
        const start = leave.startDate < trackingStart ? trackingStart : leave.startDate
        const end = leave.endDate > today ? today : leave.endDate
        return start <= end ? sum + countWorkingDays(start, end) : sum
    }, 0)
    const workingDaysSoFar = countWorkingDays(trackingStart, today)

    const tasks = groupCounts(taskStatus)
    const completionTrend = Array.from({ length: 4 }, (_, i) => {
        const from = addDays(fourWeeksAgo, i * 7)
        const to = addDays(from, 7)
        return completedRecent.filter((t) => t.completedAt >= from && t.completedAt < to).length
    })

    const balance = user.leaveBalance || {}

    return {
        role: user.role,
        today: todayRecord,
        stats: {
            hoursThisWeek: Math.round(weeklyHours.reduce((a, b) => a + b, 0) * 10) / 10,
            attendanceRate: workingDaysSoFar ? Math.round((daysAttended / workingDaysSoFar) * 100) : 0,
            daysAttended,
            workingDaysSoFar,
            leaveBalanceTotal: (balance.casual || 0) + (balance.sick || 0) + (balance.earned || 0),
            openTasks: (tasks.pending || 0) + (tasks['in-progress'] || 0),
            dueToday,
            overdueTasks: overdue
        },
        weeklyHours: { labels: weekDays.map(DAY_LABEL), values: weeklyHours },
        attendanceBreakdown: {
            present: status.present || 0,
            late: status.late || 0,
            halfDay: status['half-day'] || 0,
            onLeave: leaveDays,
            absent: Math.max(workingDaysSoFar - daysAttended - leaveDays, 0),
            totalHours: Math.round(hoursThisMonth * 10) / 10
        },
        leaveBalance: balance,
        leaveCounts: groupCounts(leaveCounts),
        taskStatus: {
            pending: tasks.pending || 0,
            inProgress: tasks['in-progress'] || 0,
            completed: tasks.completed || 0,
            overdue
        },
        taskCompletionTrend: { labels: ['3 wks ago', '2 wks ago', 'Last week', 'This week'], values: completionTrend },
        upcomingTasks,
        recentLeaves
    }
}

const getDashboard = async (req, res) => {
    const { user } = req
    const isManagement = MANAGEMENT_ROLES.includes(user.role)
    // ?view=personal lets managers see their own attendance dashboard too
    const personal = !isManagement || req.query.view === 'personal'

    const key = personal
        ? `${cache.CACHE_KEYS.DASHBOARD}personal:${user._id}`
        : `${cache.CACHE_KEYS.DASHBOARD}${user.role}`

    const data = await cache.remember(key, CACHE_TTL.DASHBOARD, () =>
        personal ? buildPersonalDashboard(user) : buildManagementDashboard(user.role)
    )

    return sendSuccess(res, { data })
}

module.exports = { getDashboard }
