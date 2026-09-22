const jwt = require('jsonwebtoken')
const User = require('../models/user')
const AppError = require('../utils/AppError')

const verifyJWT = async (req, _res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
    if (!token) throw new AppError('Authentication required', 401)

    let decoded
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY)
    } catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token'
        throw new AppError(message, 401)
    }

    const user = await User.findById(decoded.userId)
    if (!user) throw new AppError('User no longer exists', 401)
    if (!user.isActive) throw new AppError('Your account is inactive', 403)

    req.user = user
    next()
}

module.exports = verifyJWT
