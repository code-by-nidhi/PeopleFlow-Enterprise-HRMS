const mongoose = require('mongoose')
const { LEAVE_TYPES } = require('../config/constants')

const leaveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    leaveType: {
        type: String,
        enum: LEAVE_TYPES,
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    reviewNote: {
        type: String,
        trim: true,
        maxlength: 500
    }
}, { timestamps: true })

leaveSchema.index({ startDate: 1, endDate: 1 })

module.exports = mongoose.model('Leave', leaveSchema)
