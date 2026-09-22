const { emailRegex, passwordRegex } = require('../utils/regex')

const PASSWORD_RULES = 'Password must be 8-20 characters with uppercase, lowercase, number and special character (@$!%*?&)'

const validateLogin = ({ email, password }) => {
    if (!email || !password) return 'Email and password are required'
    if (!emailRegex.test(email)) return 'Invalid email format'
    return null
}

const validateChangePassword = ({ currentPassword, newPassword, confirmPassword }) => {
    if (!currentPassword || !newPassword || !confirmPassword) return 'All password fields are required'
    if (!passwordRegex.test(newPassword)) return PASSWORD_RULES
    if (newPassword !== confirmPassword) return 'New password and confirm password do not match'
    if (newPassword === currentPassword) return 'New password cannot be same as current password'
    return null
}

module.exports = { validateLogin, validateChangePassword, PASSWORD_RULES }
