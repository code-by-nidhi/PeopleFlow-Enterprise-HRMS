const express = require('express')
const rateLimit = require('express-rate-limit')
const { loginUser, refreshToken, logoutUser, getLoggedInUser, changePassword } = require('../controllers/auth')
const verifyJWT = require('../middleware/verifyJWT')
const validate = require('../middleware/validate')
const { validateLogin, validateChangePassword } = require('../validators/authValidator')

const router = express.Router()

// Slow down credential stuffing without affecting normal use. Only failed attempts
// count, so a whole office signing in from one NAT'd IP is never locked out.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
})

router.post('/login', loginLimiter, validate(validateLogin), loginUser)
router.post('/refresh-token', refreshToken)
router.post('/logout', logoutUser)
router.get('/me', verifyJWT, getLoggedInUser)
router.patch('/change-password', verifyJWT, validate(validateChangePassword), changePassword)
// Older clients used POST for this endpoint
router.post('/change-password', verifyJWT, validate(validateChangePassword), changePassword)

module.exports = router
