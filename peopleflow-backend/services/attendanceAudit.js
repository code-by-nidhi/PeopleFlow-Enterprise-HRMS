const AttendanceAuditLog = require('../models/attendanceAuditLog')

const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/

/**
 * Who/where a request came from, for the audit trail. The device id is a random
 * value the app stores per browser; it is only an audit hint, never an identity.
 */
const requestContext = (req) => {
    const deviceId = req.get('x-device-id')
    return {
        ipAddress: req.ip,
        userAgent: String(req.get('user-agent') || '').slice(0, 300),
        deviceId: deviceId && DEVICE_ID_PATTERN.test(deviceId) ? deviceId : undefined
    }
}

/**
 * Appends an entry to the attendance audit log. A logging failure is reported
 * but never turns an otherwise valid request into an error.
 */
const recordAudit = async (entry) => {
    try {
        await AttendanceAuditLog.create(entry)
    } catch (error) {
        console.error('Attendance audit log write failed:', error.message)
    }
}

module.exports = { requestContext, recordAudit }
