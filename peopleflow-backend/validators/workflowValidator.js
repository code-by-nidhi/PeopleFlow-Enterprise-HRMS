const mongoose = require('mongoose')
const { LEAVE_TYPES, TASK_PRIORITIES, TASK_STATUSES } = require('../config/constants')
const { isValidDate, startOfDay } = require('../utils/dates')

const validateApplyLeave = ({ leaveType, startDate, endDate, reason }) => {
    if (!leaveType || !startDate || !endDate || !reason) return 'Leave type, start date, end date and reason are required'
    if (!LEAVE_TYPES.includes(leaveType)) return `Leave type must be one of: ${LEAVE_TYPES.join(', ')}`
    if (!isValidDate(startDate) || !isValidDate(endDate)) return 'Invalid dates'
    if (startOfDay(startDate) < startOfDay(new Date())) return 'Leave cannot start in the past'
    if (new Date(endDate) < new Date(startDate)) return 'End date cannot be before start date'
    if (String(reason).trim().length < 5) return 'Please provide a reason (at least 5 characters)'
    return null
}

const validateTask = (partial) => ({ title, assignedTo, priority, status, deadline }) => {
    if (!partial && (!title || !assignedTo || !deadline)) return 'Title, assignee and deadline are required'
    if (title !== undefined && String(title).trim().length < 3) return 'Title must be at least 3 characters'
    if (assignedTo !== undefined && !mongoose.Types.ObjectId.isValid(assignedTo)) return 'Invalid assignee'
    if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) return 'Invalid priority'
    if (status !== undefined && !TASK_STATUSES.includes(status)) return 'Invalid status'
    if (deadline !== undefined && !isValidDate(deadline)) return 'Invalid deadline'
    return null
}

module.exports = {
    validateApplyLeave,
    validateCreateTask: validateTask(false),
    validateUpdateTask: validateTask(true)
}
