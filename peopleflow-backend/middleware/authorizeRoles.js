const AppError = require('../utils/AppError')

const authorizeRoles = (...roles) => (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        throw new AppError('You do not have permission to perform this action', 403)
    }
    next()
}

module.exports = authorizeRoles
