const express = require('express')
const rateLimit = require('express-rate-limit')
const { getOffices, getOfficeById, createOffice, updateOffice, generateOfficeQr } = require('../controllers/office')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateOffice, validateUpdateOffice } = require('../validators/attendanceValidator')
const { ATTENDANCE_ADMIN_ROLES, MANAGEMENT_ROLES } = require('../config/constants')

const router = express.Router()

// A kiosk rotates on a timer and after every scan; this comfortably covers a morning rush
const qrLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    keyGenerator: (req) => `office-qr:${req.user._id}`,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many QR codes requested. Please wait a moment.' }
})

const officeAdmins = authorizeRoles(...ATTENDANCE_ADMIN_ROLES)

router.use(verifyJWT)

// Managers may read offices (e.g. to pick one for a manual record); only admin/HR change them
router.get('/', authorizeRoles(...MANAGEMENT_ROLES), getOffices)
router.get('/:id', authorizeRoles(...MANAGEMENT_ROLES), getOfficeById)
router.post('/', officeAdmins, validate(validateCreateOffice), createOffice)
router.patch('/:id', officeAdmins, validate(validateUpdateOffice), updateOffice)
router.post('/:id/qr', officeAdmins, qrLimiter, generateOfficeQr)

module.exports = router
