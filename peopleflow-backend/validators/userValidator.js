const { nameRegex, emailRegex } = require('../utils/regex')
const { ROLES } = require('../config/constants')

// Employees are created through /api/employees so they always get a profile
const ACCOUNT_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER]

const validateCreateUser = ({ name, email, role }) => {
    if (!name || !email || !role) return 'Name, email and role are required'
    if (!nameRegex.test(name.trim())) return 'Invalid name'
    if (!emailRegex.test(email)) return 'Invalid email format'
    if (!ACCOUNT_ROLES.includes(role)) return `Role must be one of: ${ACCOUNT_ROLES.join(', ')}`
    return null
}

const validateUpdateUser = ({ name, email, role }) => {
    if (name !== undefined && !nameRegex.test(String(name).trim())) return 'Invalid name'
    if (email !== undefined && !emailRegex.test(email)) return 'Invalid email format'
    if (role !== undefined && !Object.values(ROLES).includes(role)) return 'Invalid role'
    return null
}

module.exports = { validateCreateUser, validateUpdateUser, ACCOUNT_ROLES }
