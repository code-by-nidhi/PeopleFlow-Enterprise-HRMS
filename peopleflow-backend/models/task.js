const mongoose = require('mongoose')
const { TASK_PRIORITIES, TASK_STATUSES } = require('../config/constants')

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    priority: {
        type: String,
        enum: TASK_PRIORITIES,
        default: 'medium'
    },
    status: {
        type: String,
        enum: TASK_STATUSES,
        default: 'pending',
        index: true
    },
    deadline: {
        type: Date,
        required: true
    },
    completedAt: Date
}, { timestamps: true })

taskSchema.index({ deadline: 1 })

module.exports = mongoose.model('Task', taskSchema)
