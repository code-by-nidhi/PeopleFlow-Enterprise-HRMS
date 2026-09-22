const multer = require('multer')

const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })
}

// Express 5 forwards rejected promises from async handlers here automatically
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
    let statusCode = err.statusCode || 500
    let message = err.message || 'Internal server error'

    if (err.name === 'CastError') {
        statusCode = 400
        message = `Invalid ${err.path}: ${err.value}`
    } else if (err.name === 'ValidationError') {
        statusCode = 400
        message = Object.values(err.errors).map((e) => e.message).join(', ')
    } else if (err.code === 11000) {
        statusCode = 409
        const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field'
        message = `A record with this ${field} already exists`
    } else if (err instanceof multer.MulterError) {
        statusCode = 400
        message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message
    } else if (err.type === 'entity.parse.failed') {
        statusCode = 400
        message = 'Malformed JSON body'
    }

    if (statusCode >= 500) {
        console.error(err)
        if (process.env.NODE_ENV === 'production') message = 'Internal server error'
    }

    const body = { success: false, message }
    // Operational errors may carry a machine-readable reason (e.g. QR_EXPIRED) for the UI
    if (err.isOperational && typeof err.code === 'string') body.code = err.code
    res.status(statusCode).json(body)
}

module.exports = { notFound, errorHandler }
