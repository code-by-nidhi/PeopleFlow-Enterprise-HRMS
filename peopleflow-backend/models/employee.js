const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['resume', 'id-proof', 'salary-slip', 'other'],
        default: 'other'
    },
    url: { type: String, required: true },
    publicId: String,
    uploadedAt: { type: Date, default: Date.now }
})

const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    employeeId: {
        type: String,
        unique: true,
        required: true
    },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    phone: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    dateOfBirth: Date,
    address: String,

    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },

    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation',
        index: true
    },

    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'intern'],
        default: 'full-time'
    },

    status: {
        type: String,
        enum: ['active', 'probation', 'on-leave', 'inactive'],
        default: 'active',
        index: true
    },

    // Monthly salary structure
    salary: {
        basic: { type: Number, required: true, min: 0 },
        hra: { type: Number, default: 0, min: 0 },
        allowances: { type: Number, default: 0, min: 0 },
        deductions: { type: Number, default: 0, min: 0 }
    },

    joiningDate: { type: Date, required: true },

    resume: documentSchema,
    documents: [documentSchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

employeeSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`
})

employeeSchema.virtual('grossSalary').get(function () {
    if (!this.salary) return 0
    const { basic = 0, hra = 0, allowances = 0, deductions = 0 } = this.salary
    return basic + hra + allowances - deductions
})

employeeSchema.index({ firstName: 'text', lastName: 'text', employeeId: 'text' })

module.exports = mongoose.model('Employee', employeeSchema)
