const mongoose = require('mongoose')
const { AUDIT_ACTIONS } = require('../config/constants')

/**
 * Append-only history of every attendance attempt, rejection, success and manual
 * change. Updates and deletes are blocked at the model level.
 */
const attendanceAuditLogSchema = new mongoose.Schema({
    // The employee the event is about
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Who performed it: the employee, or the admin/HR user for manual changes
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office' },
    verification: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceVerification' },
    action: {
        type: String,
        enum: Object.values(AUDIT_ACTIONS),
        required: true
    },
    // Machine-readable rejection reason, e.g. GEOFENCE_OUTSIDE or QR_EXPIRED
    reason: String,
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        distance: Number
    },
    metadata: mongoose.Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false } })

attendanceAuditLogSchema.index({ createdAt: -1 })
attendanceAuditLogSchema.index({ action: 1, createdAt: -1 })

const immutable = function () {
    throw new Error('Attendance audit log entries are immutable')
}
;['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']
    .forEach((op) => attendanceAuditLogSchema.pre(op, immutable))
attendanceAuditLogSchema.pre('save', function () {
    if (!this.isNew) immutable()
})

module.exports = mongoose.model('AttendanceAuditLog', attendanceAuditLogSchema)
