/** Operational error with an HTTP status, rendered by the central error handler. */
class AppError extends Error {
    /**
     * @param {string} message  Safe, user-facing message
     * @param {number} statusCode
     * @param {string} [code]   Optional machine-readable reason, e.g. QR_EXPIRED
     */
    constructor(message, statusCode = 400, code) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        if (code) this.code = code
    }
}

module.exports = AppError
