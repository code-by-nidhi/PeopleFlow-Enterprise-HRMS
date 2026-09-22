const mongoose = require('mongoose')

const designationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Suggested monthly salary band for this role
    salaryRange: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

designationSchema.index({ title: 1, department: 1 }, { unique: true, name: 'title_department_ci_unique', collation: { locale: 'en', strength: 2 } })

module.exports = mongoose.model('Designation', designationSchema)
