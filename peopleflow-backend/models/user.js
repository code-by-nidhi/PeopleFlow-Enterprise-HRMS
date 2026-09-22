const mongoose = require('mongoose')
const { ROLES, DEFAULT_LEAVE_BALANCE } = require('../config/constants')

const fileSchema = new mongoose.Schema({
    url: String,
    publicId: String
}, { _id: false })

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.EMPLOYEE,
        index: true
    },

    mustChangePassword: {
        type: Boolean,
        default: true
    },

    refreshToken: {
        type: String,
        select: false
    },

    // Previous token hash, accepted briefly so parallel tabs refreshing at once don't log each other out
    previousRefreshToken: {
        type: String,
        select: false
    },
    refreshRotatedAt: {
        type: Date,
        select: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    avatar: fileSchema,

    leaveBalance: {
        casual: { type: Number, default: DEFAULT_LEAVE_BALANCE.casual },
        sick: { type: Number, default: DEFAULT_LEAVE_BALANCE.sick },
        earned: { type: Number, default: DEFAULT_LEAVE_BALANCE.earned }
    },

    lastLoginAt: Date
}, { timestamps: true })

userSchema.set('toJSON', {
    transform: (_doc, ret) => {
        delete ret.password
        delete ret.refreshToken
        delete ret.previousRefreshToken
        delete ret.refreshRotatedAt
        delete ret.__v
        return ret
    }
})

module.exports = mongoose.model('User', userSchema)
