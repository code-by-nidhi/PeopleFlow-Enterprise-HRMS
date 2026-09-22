const express = require('express')
const rateLimit = require('express-rate-limit')
const {
    verifyLocation, checkIn, checkOut, getToday, getMyAttendance, getAttendance, getEmployeeAttendance,
    getAuditLog, correctAttendance, createManualAttendance
} = require('../controllers/attendance')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCorrection, validateManualAttendance } = require('../validators/attendanceValidator')
const { MANAGEMENT_ROLES, ATTENDANCE_ROLES, ATTENDANCE_ADMIN_ROLES } = require('../config/constants')

const router = express.Router()

// Keyed by the authenticated user (not IP) so a whole office behind one NAT is never
// throttled together. A normal check-in is 2 requests; this leaves room for retries.
const attendanceLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    keyGenerator: (req) => `attendance:${req.user._id}`,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many attendance attempts. Please wait a few minutes and try again.' }
})

router.use(verifyJWT)

// Verified self-service attendance: only employees (not admins) record their own
const selfService = [authorizeRoles(...ATTENDANCE_ROLES), attendanceLimiter]
router.post('/verify-location', ...selfService, verifyLocation)
router.post('/check-in', ...selfService, checkIn)
router.post('/check-out', ...selfService, checkOut)
// Older clients used PATCH for check-out
router.patch('/check-out', ...selfService, checkOut)
router.get('/today', getToday)
router.get('/me', getMyAttendance)

// Admin / HR oversight
router.get('/audit', authorizeRoles(...ATTENDANCE_ADMIN_ROLES), getAuditLog)
// Office correction rules decide which of these roles may actually correct
router.post('/manual', authorizeRoles(...MANAGEMENT_ROLES), validate(validateManualAttendance), createManualAttendance)
router.patch('/:id/correct', authorizeRoles(...MANAGEMENT_ROLES), validate(validateCorrection), correctAttendance)

router.get('/', authorizeRoles(...MANAGEMENT_ROLES), getAttendance)
router.get('/:employeeId', getEmployeeAttendance)

module.exports = router
