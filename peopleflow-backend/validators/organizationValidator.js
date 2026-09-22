const mongoose = require('mongoose')
const { departmentRegex, designationRegex } = require('../utils/regex')

const validateDepartment = (partial) => ({ name, description, head }) => {
    if (!partial && !name) return 'Department name is required'
    if (name !== undefined && !departmentRegex.test(String(name).trim())) return 'Department name may contain only letters, spaces and & (2-50 characters)'
    if (description && String(description).length > 500) return 'Description must be under 500 characters'
    if (head && !mongoose.Types.ObjectId.isValid(head)) return 'Invalid department head'
    return null
}

const validateDesignation = (partial) => ({ title, department, description, salaryRange }) => {
    if (!partial && !title) return 'Designation title is required'
    if (title !== undefined && !designationRegex.test(String(title).trim())) return 'Designation title may contain only letters, spaces, & - / (2-50 characters)'
    if (department && !mongoose.Types.ObjectId.isValid(department)) return 'Invalid department'
    if (description && String(description).length > 500) return 'Description must be under 500 characters'
    if (salaryRange) {
        const min = Number(salaryRange.min || 0)
        const max = Number(salaryRange.max || 0)
        if (min < 0 || max < 0) return 'Salary range cannot be negative'
        if (max && min > max) return 'Minimum salary cannot exceed maximum salary'
    }
    return null
}

module.exports = {
    validateCreateDepartment: validateDepartment(false),
    validateUpdateDepartment: validateDepartment(true),
    validateCreateDesignation: validateDesignation(false),
    validateUpdateDesignation: validateDesignation(true)
}
