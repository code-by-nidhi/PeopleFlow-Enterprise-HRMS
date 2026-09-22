const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000

const generateAccessToken = (user) =>
    jwt.sign({ userId: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '15m' })

// jwtid makes every token unique, even two issued within the same second
const generateRefreshToken = (user) =>
    jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET_KEY, { expiresIn: '7d', jwtid: crypto.randomUUID() })

// Only a hash of the refresh token is stored, so a leaked database cannot mint sessions
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

const isProduction = () => process.env.NODE_ENV === 'production'

const refreshCookieOptions = () => ({
    httpOnly: true,
    secure: isProduction(),
    // Frontend and API live on different domains in production
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS
})

module.exports = { generateAccessToken, generateRefreshToken, hashToken, refreshCookieOptions }
