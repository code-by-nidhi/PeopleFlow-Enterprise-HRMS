const Task = require('../models/task')
const User = require('../models/user')
const AppError = require('../utils/AppError')
const { sendSuccess, getPagination, escapeRegex } = require('../utils/apiResponse')
const { startOfDay } = require('../utils/dates')
const { notifyUsers } = require('../services/notification')
const cache = require('../services/cache')
const { MANAGEMENT_ROLES } = require('../config/constants')

const EDITABLE_FIELDS = ['title', 'description', 'assignedTo', 'priority', 'status', 'deadline']
const SORTS = { deadline: { deadline: 1 }, '-deadline': { deadline: -1 }, newest: { createdAt: -1 } }

const populateTask = (query) => query
    .populate('assignedTo', 'name email avatar role')
    .populate('assignedBy', 'name email')

const isManagement = (user) => MANAGEMENT_ROLES.includes(user.role)

const buildFilter = async ({ status, priority, assignedTo, search, overdue }) => {
    const filter = {}
    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (assignedTo) filter.assignedTo = assignedTo
    if (search) filter.title = new RegExp(escapeRegex(search), 'i')
    if (overdue === 'true') {
        filter.status = { $ne: 'completed' }
        filter.deadline = { $lt: startOfDay() }
    }
    return filter
}

const statusCounts = async (match) => {
    const [rows, overdue] = await Promise.all([
        Task.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Task.countDocuments({ ...match, status: { $ne: 'completed' }, deadline: { $lt: startOfDay() } })
    ])
    const counts = { pending: 0, 'in-progress': 0, completed: 0, overdue }
    rows.forEach((row) => { counts[row._id] = row.count })
    return counts
}

const listTasks = async (filter, query, countMatch) => {
    const { skip, limit, buildMeta } = getPagination(query)
    const [tasks, total, counts] = await Promise.all([
        populateTask(Task.find(filter).sort(SORTS[query.sort] || SORTS.deadline).skip(skip).limit(limit)).lean(),
        Task.countDocuments(filter),
        statusCounts(countMatch)
    ])
    return { data: tasks, meta: { ...buildMeta(total), counts } }
}

const createTask = async (req, res) => {
    const { title, description, assignedTo, priority, deadline } = req.body

    const assignee = await User.findOne({ _id: assignedTo, isActive: true }).select('name')
    if (!assignee) throw new AppError('Assignee not found or inactive', 404)

    const task = await Task.create({
        title: title.trim(),
        description,
        assignedTo,
        assignedBy: req.user._id,
        priority,
        deadline
    })

    await notifyUsers([assignedTo], {
        title: 'New task assigned',
        message: `${req.user.name} assigned you "${task.title}" due ${new Date(task.deadline).toDateString()}.`,
        type: 'task',
        link: `/tasks/${task._id}`
    })
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    const populated = await populateTask(Task.findById(task._id))
    return sendSuccess(res, { statusCode: 201, message: 'Task created successfully', data: populated })
}

const getTasks = async (req, res) => {
    const filter = await buildFilter(req.query)
    return sendSuccess(res, await listTasks(filter, req.query, {}))
}

const getMyTasks = async (req, res) => {
    const filter = { ...(await buildFilter(req.query)), assignedTo: req.user._id }
    return sendSuccess(res, await listTasks(filter, req.query, { assignedTo: req.user._id }))
}

const getTaskById = async (req, res) => {
    const task = await populateTask(Task.findById(req.params.id)).lean()
    if (!task) throw new AppError('Task not found', 404)

    const involved = [task.assignedTo?._id, task.assignedBy?._id].some((id) => String(id) === String(req.user._id))
    if (!involved && !isManagement(req.user)) throw new AppError('You do not have access to this task', 403)

    return sendSuccess(res, { data: task })
}

const updateTask = async (req, res) => {
    const task = await Task.findById(req.params.id)
    if (!task) throw new AppError('Task not found', 404)

    const isAssignee = task.assignedTo.equals(req.user._id)
    const canEditAll = isManagement(req.user)
    if (!canEditAll && !isAssignee) throw new AppError('You do not have access to this task', 403)

    // Assignees may only move their task through the workflow
    const allowed = canEditAll ? EDITABLE_FIELDS : ['status']
    const blocked = Object.keys(req.body).filter((key) => EDITABLE_FIELDS.includes(key) && !allowed.includes(key))
    if (blocked.length) throw new AppError(`You can only update the task status`, 403)

    const previousAssignee = String(task.assignedTo)
    const previousStatus = task.status

    if (req.body.assignedTo && req.body.assignedTo !== previousAssignee) {
        if (!(await User.exists({ _id: req.body.assignedTo, isActive: true }))) {
            throw new AppError('Assignee not found or inactive', 404)
        }
    }

    allowed.forEach((key) => {
        if (req.body[key] !== undefined) task[key] = key === 'title' ? String(req.body[key]).trim() : req.body[key]
    })

    if (task.status !== previousStatus) {
        task.completedAt = task.status === 'completed' ? new Date() : undefined
    }
    await task.save()

    const link = `/tasks/${task._id}`
    const notifications = []
    if (String(task.assignedTo) !== previousAssignee) {
        notifications.push(notifyUsers([task.assignedTo], {
            title: 'New task assigned',
            message: `${req.user.name} assigned you "${task.title}".`,
            type: 'task',
            link
        }))
    } else if (!isAssignee) {
        notifications.push(notifyUsers([task.assignedTo], {
            title: 'Task updated',
            message: `${req.user.name} updated "${task.title}".`,
            type: 'task',
            link
        }))
    }
    if (isAssignee && task.status !== previousStatus && !task.assignedBy.equals(req.user._id)) {
        notifications.push(notifyUsers([task.assignedBy], {
            title: task.status === 'completed' ? 'Task completed' : 'Task status changed',
            message: `${req.user.name} moved "${task.title}" to ${task.status.replace('-', ' ')}.`,
            type: 'task',
            link
        }))
    }
    await Promise.all(notifications)
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    const populated = await populateTask(Task.findById(task._id))
    return sendSuccess(res, { message: 'Task updated successfully', data: populated })
}

const deleteTask = async (req, res) => {
    const task = await Task.findByIdAndDelete(req.params.id)
    if (!task) throw new AppError('Task not found', 404)

    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)
    return sendSuccess(res, { message: 'Task deleted successfully' })
}

module.exports = { createTask, getTasks, getMyTasks, getTaskById, updateTask, deleteTask }
