const mongoose = require('mongoose')

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

// Case-insensitive uniqueness ("Sales" and "sales" are the same department)
departmentSchema.index({ name: 1 }, { unique: true, name: 'name_ci_unique', collation: { locale: 'en', strength: 2 } })

module.exports = mongoose.model('Department', departmentSchema)
