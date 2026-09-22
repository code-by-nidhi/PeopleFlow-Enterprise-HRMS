const Notification = require('../models/notification')
const AppError = require('../utils/AppError')
const { sendSuccess, getPagination } = require('../utils/apiResponse')

const getNotifications = async (req, res) => {
    const { skip, limit, buildMeta } = getPagination(req.query, 20)
    const filter = { user: req.user._id }
    if (req.query.unread === 'true') filter.isRead = false

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ user: req.user._id, isRead: false })
    ])

    return sendSuccess(res, { data: notifications, meta: { ...buildMeta(total), unreadCount } })
}

const markAsRead = async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { isRead: true },
        { returnDocument: 'after' }
    )
    if (!notification) throw new AppError('Notification not found', 404)
    return sendSuccess(res, { message: 'Notification marked as read', data: notification })
}

const markAllAsRead = async (req, res) => {
    const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true })
    return sendSuccess(res, { message: `${result.modifiedCount} notification(s) marked as read` })
}

const deleteNotification = async (req, res) => {
    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id })
    if (!result.deletedCount) throw new AppError('Notification not found', 404)
    return sendSuccess(res, { message: 'Notification deleted' })
}

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification }
