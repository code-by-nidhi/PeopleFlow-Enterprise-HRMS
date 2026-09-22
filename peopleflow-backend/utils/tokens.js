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

/**
 * Over HTTPS (deployed) the frontend and API live on different domains, so the cookie
 * must be cross-site. Local development runs on plain http://localhost, where browsers
 * reject SameSite=None cookies, so it stays Lax there.
 */
const refreshCookieOptions = (req) => {
    const crossSite = isProduction() || Boolean(req?.secure)
    return {
        httpOnly: true,
        secure: crossSite,
        sameSite: crossSite ? 'none' : 'lax',
        path: '/api/auth',
        maxAge: REFRESH_TTL_MS
    }
}

module.exports = { generateAccessToken, generateRefreshToken, hashToken, refreshCookieOptions }
