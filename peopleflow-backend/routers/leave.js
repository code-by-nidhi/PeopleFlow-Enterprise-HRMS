const express = require('express')
const { applyLeave, getLeaves, getMyLeaves, getLeaveById, approveLeave, rejectLeave, cancelLeave } = require('../controllers/leave')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateApplyLeave } = require('../validators/workflowValidator')
const { MANAGEMENT_ROLES } = require('../config/constants')

const router = express.Router()
const reviewers = authorizeRoles(...MANAGEMENT_ROLES)

router.use(verifyJWT)

router.post('/', validate(validateApplyLeave), applyLeave)
router.get('/', reviewers, getLeaves)
router.get('/me', getMyLeaves)
router.get('/:id', getLeaveById)
router.patch('/:id/approve', reviewers, approveLeave)
router.patch('/:id/reject', reviewers, rejectLeave)
router.patch('/:id/cancel', cancelLeave)

module.exports = router
