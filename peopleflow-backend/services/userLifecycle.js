const User = require('../models/user')
const Employee = require('../models/employee')
const Attendance = require('../models/attendance')
const AttendanceVerification = require('../models/attendanceVerification')
const Leave = require('../models/leave')
const Task = require('../models/task')
const Notification = require('../models/notification')
const { deleteFile } = require('./storage')
const cache = require('./cache')

/** Removes a user account together with its employee profile, files and records. */
const deleteUserCascade = async (userId) => {
    const [user, employee] = await Promise.all([
        User.findById(userId),
        Employee.findOne({ user: userId })
    ])

    const files = [
        user?.avatar?.publicId,
        employee?.resume?.publicId,
        ...(employee?.documents || []).map((doc) => doc.publicId)
    ]

    await Promise.all([
        User.deleteOne({ _id: userId }),
        Employee.deleteOne({ user: userId }),
        Attendance.deleteMany({ user: userId }),
        // The append-only attendance audit log is intentionally kept
        AttendanceVerification.deleteMany({ user: userId }),
        Leave.deleteMany({ user: userId }),
        Task.deleteMany({ assignedTo: userId }),
        Notification.deleteMany({ user: userId }),
        Employee.updateMany({ manager: userId }, { $unset: { manager: 1 } })
    ])

    await Promise.all(files.filter(Boolean).map(deleteFile))
    await cache.invalidate(cache.CACHE_KEYS.EMPLOYEES, cache.CACHE_KEYS.DASHBOARD, cache.CACHE_KEYS.DEPARTMENTS, cache.CACHE_KEYS.DESIGNATIONS)
}

const credentialsEmail = ({ name, email, password, role }) => ({
    to: email,
    subject: 'Your PeopleFlow HRMS login credentials',
    text: `Hello ${name},

Your PeopleFlow HRMS ${role} account has been created.

Email: ${email}
Temporary Password: ${password}

Please log in and change your password after your first login.

Regards,
PeopleFlow HRMS Team`
})

module.exports = { deleteUserCascade, credentialsEmail }
