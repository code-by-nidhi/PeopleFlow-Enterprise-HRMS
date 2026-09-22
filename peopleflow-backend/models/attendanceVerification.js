const mongoose = require('mongoose')
const { ATTENDANCE_ACTIONS } = require('../config/constants')

/**
 * One check-in/out attempt. Created when the server has verified the employee's
 * location, then completed exactly once when a valid office QR is presented.
 * Its id doubles as the idempotency key of the final check-in/out request.
 */
const attendanceVerificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: ATTENDANCE_ACTIONS,
        required: true
    },
    office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'rejected'],
        default: 'pending'
    },
    location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        distance: Number
    },
    // Signals worth a human look that do not block the attempt on their own
    flags: [String],
    deviceId: String,
    ipAddress: String,
    userAgent: String,

    expiresAt: {
        type: Date,
        required: true
    },
    reason: String,
    qrToken: { type: mongoose.Schema.Types.ObjectId, ref: 'OfficeQrToken' },
    attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
    completedAt: Date
}, { timestamps: true })

// Attempts are working state; the audit log and attendance record keep what matters
attendanceVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

module.exports = mongoose.model('AttendanceVerification', attendanceVerificationSchema)
