const mongoose = require('mongoose')
const { nameRegex, emailRegex, passwordRegex, phoneRegex } = require('../utils/regex')
const { isValidDate } = require('../utils/dates')
const { PASSWORD_RULES } = require('./authValidator')

const isId = (value) => mongoose.Types.ObjectId.isValid(value)
const isMoney = (value) => value === undefined || value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)

const GENDERS = ['male', 'female', 'other', 'prefer-not-to-say']
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'intern']
const STATUSES = ['active', 'probation', 'on-leave', 'inactive']

/** Shared checks for create (partial=false) and update (partial=true). */
const validateEmployee = (body, partial) => {
    const has = (key) => body[key] !== undefined && body[key] !== ''

    if (!partial) {
        const required = ['firstName', 'lastName', 'email', 'department', 'designation', 'joiningDate']
        const missing = required.filter((key) => !has(key))
        if (missing.length) return `Missing required fields: ${missing.join(', ')}`
        if (!has('salary') || body.salary.basic === undefined || body.salary.basic === '') return 'Basic salary is required'
    }

    if (has('firstName') && !nameRegex.test(body.firstName.trim())) return 'Invalid first name'
    if (has('lastName') && !nameRegex.test(body.lastName.trim())) return 'Invalid last name'
    if (has('email') && !emailRegex.test(body.email)) return 'Invalid email format'
    if (has('password') && !passwordRegex.test(body.password)) return PASSWORD_RULES
    if (has('phone') && !phoneRegex.test(body.phone)) return 'Phone must be a valid 10 digit mobile number'
    if (has('gender') && !GENDERS.includes(body.gender)) return 'Invalid gender'
    if (has('employmentType') && !EMPLOYMENT_TYPES.includes(body.employmentType)) return 'Invalid employment type'
    if (has('status') && !STATUSES.includes(body.status)) return 'Invalid status'
    if (has('department') && !isId(body.department)) return 'Invalid department'
    if (has('designation') && !isId(body.designation)) return 'Invalid designation'
    if (has('manager') && !isId(body.manager)) return 'Invalid manager'
    if (has('joiningDate') && !isValidDate(body.joiningDate)) return 'Invalid joining date'
    if (has('dateOfBirth') && !isValidDate(body.dateOfBirth)) return 'Invalid date of birth'

    if (has('salary')) {
        if (typeof body.salary !== 'object') return 'Salary must be an object'
        const { basic, hra, allowances, deductions } = body.salary
        if (![basic, hra, allowances, deductions].every(isMoney)) return 'Salary components must be positive numbers'
        if (!partial && Number(basic) <= 0) return 'Basic salary must be greater than zero'
    }
    return null
}

module.exports = {
    validateCreateEmployee: (body) => validateEmployee(body, false),
    validateUpdateEmployee: (body) => validateEmployee(body, true)
}
