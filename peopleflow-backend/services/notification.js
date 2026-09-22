const Notification = require('../models/notification')
const User = require('../models/user')
const { emitToUser } = require('../sockets')

/**
 * Persists a notification for each recipient and pushes it in real time.
 * Failures are logged, never thrown: a notification must not break the action that caused it.
 */
const notifyUsers = async (userIds, { title, message, type = 'system', link }) => {
    try {
        const ids = [...new Set(userIds.filter(Boolean).map(String))]
        if (!ids.length) return

        const docs = await Notification.insertMany(ids.map((user) => ({ user, title, message, type, link })))
        docs.forEach((doc) => emitToUser(doc.user, 'notification', doc.toJSON()))
    } catch (error) {
        console.error('Notification failed:', error.message)
    }
}

const notifyRoles = async (roles, payload, { excludeUserId } = {}) => {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean()
    const ids = users.map((u) => String(u._id)).filter((id) => id !== String(excludeUserId))
    return notifyUsers(ids, payload)
}

module.exports = { notifyUsers, notifyRoles }
