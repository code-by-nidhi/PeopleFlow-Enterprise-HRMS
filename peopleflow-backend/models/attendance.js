const mongoose = require('mongoose')

// Where the employee was when the server verified the action (rounded to ~1 m)
const locationSchema = new mongoose.Schema({
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    distance: Number
}, { _id: false })

// How a check-in/out was proven: geofence + office QR, or a manual correction
const verificationSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['verified', 'flagged', 'manual']
    },
    method: {
        type: String,
        enum: ['geofence+qr', 'manual']
    },
    flags: [String],
    verification: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceVerification' },
    qrToken: { type: mongoose.Schema.Types.ObjectId, ref: 'OfficeQrToken' },
    deviceId: String,
    ipAddress: String
}, { _id: false })

const correctionSchema = new mongoose.Schema({
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, required: true },
    reason: { type: String, required: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
}, { _id: false })

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office'
    },
    // Normalised to midnight so there is exactly one record per user per day
    date: {
        type: Date,
        required: true
    },
    // Server-generated timestamps; client clocks are never used for attendance time
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: Date,
    workingHours: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['present', 'late', 'half-day'],
        default: 'present'
    },
    note: String,

    checkInLocation: locationSchema,
    checkOutLocation: locationSchema,
    checkInVerification: verificationSchema,
    checkOutVerification: verificationSchema,

    // Every manual change, with who made it and why
    corrections: [correctionSchema]
}, { timestamps: true })

attendanceSchema.index({ user: 1, date: -1 }, { unique: true })
attendanceSchema.index({ date: -1 })
attendanceSchema.index({ 'checkInVerification.deviceId': 1, date: -1 })

module.exports = mongoose.model('Attendance', attendanceSchema)
