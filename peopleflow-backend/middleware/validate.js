const AppError = require('../utils/AppError')

/**
 * Runs a validator `(body, req) => string | null` before the controller.
 * Validators live in /validators and return the first problem they find.
 */
const validate = (validator) => (req, _res, next) => {
    const error = validator(req.body || {}, req)
    if (error) throw new AppError(error, 400)
    next()
}

module.exports = validate
