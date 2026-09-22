const mongoose = require('mongoose')
const { ATTENDANCE_ACTIONS } = require('../config/constants')

/**
 * A short-lived, single-use QR token shown on an office kiosk. Only the SHA-256
 * hash is stored, so a database leak cannot be replayed as a valid QR code.
 */
const officeQrTokenSchema = new mongoose.Schema({
    office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Office',
        required: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Set atomically when the token is used; a consumed token can never be used again
    consumedAt: Date,
    consumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    consumedFor: { type: String, enum: ATTENDANCE_ACTIONS }
}, { timestamps: true })

// Tokens are only useful for seconds; keep them a week for audit look-ups, then drop them
officeQrTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

module.exports = mongoose.model('OfficeQrToken', officeQrTokenSchema)
