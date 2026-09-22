const mongoose = require('mongoose')
const { ATTENDANCE_SECURITY, OFFICE_START, ROLES } = require('../config/constants')

const { DEFAULTS } = ATTENDANCE_SECURITY

/** A physical office: its geofence, QR rotation and attendance rules. */
const officeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Short human-readable identifier shown on the kiosk, e.g. HQ or BLR-01
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    location: {
        latitude: { type: Number, required: true, min: -90, max: 90 },
        longitude: { type: Number, required: true, min: -180, max: 180 }
    },
    radiusMeters: {
        type: Number,
        default: DEFAULTS.radiusMeters,
        min: 10,
        max: 5000
    },
    // IANA zone used to decide the attendance day and lateness for this office
    timezone: {
        type: String,
        default: () => process.env.TZ || 'Asia/Kolkata'
    },
    qrTtlSeconds: {
        type: Number,
        default: DEFAULTS.qrTtlSeconds,
        min: 15,
        max: 300
    },
    // GPS readings less accurate than this are rejected
    maxAccuracyMeters: {
        type: Number,
        default: DEFAULTS.maxAccuracyMeters,
        min: 10,
        max: 500
    },
    rules: {
        officeStart: { type: String, default: OFFICE_START, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
        halfDayHours: { type: Number, default: DEFAULTS.halfDayHours, min: 1, max: 12 },
        // An open check-in older than this no longer counts as an active session
        maxShiftHours: { type: Number, default: DEFAULTS.maxShiftHours, min: 4, max: 24 }
    },
    // Roles allowed to manually correct attendance recorded at this office (admin always can)
    correctionRoles: {
        type: [{ type: String, enum: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] }],
        default: [ROLES.ADMIN, ROLES.HR]
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

module.exports = mongoose.model('Office', officeSchema)
