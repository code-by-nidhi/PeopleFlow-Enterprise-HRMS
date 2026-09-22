const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { generateAccessToken, generateRefreshToken, hashToken, refreshCookieOptions } = require('../utils/tokens')

const REFRESH_COOKIE = 'refreshtoken'
const ROTATION_GRACE_MS = 30 * 1000

/** Issues a new token pair, storing only the refresh token hash. */
const startSession = async (user, res) => {
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)
    user.previousRefreshToken = user.refreshToken || undefined
    user.refreshRotatedAt = new Date()
    user.refreshToken = hashToken(refreshToken)
    await user.save()
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(res.req))
    return accessToken
}

const loginUser = async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password')

    // Same message for unknown email and wrong password to avoid account enumeration
    const valid = user && (await bcryptjs.compare(password, user.password))
    if (!valid) throw new AppError('Invalid email or password', 401)
    if (!user.isActive) throw new AppError('Your account is inactive. Contact your administrator.', 403)

    user.lastLoginAt = new Date()
    const accessToken = await startSession(user, res)

    return sendSuccess(res, {
        message: user.mustChangePassword ? 'You must change your password' : 'Login successful',
        data: { user, accessToken, mustChangePassword: user.mustChangePassword }
    })
}

const refreshToken = async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) throw new AppError('Refresh token not found', 401)

    let decoded
    try {
        decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET_KEY)
    } catch {
        res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(req), maxAge: undefined })
        throw new AppError('Invalid or expired refresh token', 401)
    }

    const user = await User.findById(decoded.userId).select('+refreshToken +previousRefreshToken +refreshRotatedAt')
    if (!user || !user.isActive) throw new AppError('Session is no longer valid', 401)

    const presented = hashToken(token)
    if (user.refreshToken !== presented) {
        const withinGrace = user.previousRefreshToken === presented &&
            Date.now() - new Date(user.refreshRotatedAt).getTime() < ROTATION_GRACE_MS
        if (withinGrace) {
            // Another tab rotated a moment ago and the browser already holds the new cookie
            return sendSuccess(res, { message: 'Token refreshed', data: { user, accessToken: generateAccessToken(user), mustChangePassword: user.mustChangePassword } })
        }
        // A rotated token was replayed: revoke the session entirely
        user.refreshToken = null
        user.previousRefreshToken = null
        await user.save()
        throw new AppError('Session is no longer valid', 401)
    }

    const accessToken = await startSession(user, res)
    return sendSuccess(res, { message: 'Token refreshed', data: { user, accessToken, mustChangePassword: user.mustChangePassword } })
}

const logoutUser = async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (token) {
        await User.updateOne({ refreshToken: hashToken(token) }, { $unset: { refreshToken: 1 } })
    }
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(req), maxAge: undefined })
    return sendSuccess(res, { message: 'Logged out successfully' })
}

const getLoggedInUser = async (req, res) => {
    const employee = await Employee.findOne({ user: req.user._id })
        .populate('department', 'name')
        .populate('designation', 'title')
        .populate('manager', 'name email')

    return sendSuccess(res, { data: { user: req.user, employee } })
}

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')

    if (!(await bcryptjs.compare(currentPassword, user.password))) {
        throw new AppError('Current password is incorrect', 400)
    }

    user.password = await bcryptjs.hash(newPassword, 10)
    user.mustChangePassword = false
    await user.save()

    return sendSuccess(res, { message: 'Password changed successfully', data: { user } })
}

module.exports = { loginUser, refreshToken, logoutUser, getLoggedInUser, changePassword }
