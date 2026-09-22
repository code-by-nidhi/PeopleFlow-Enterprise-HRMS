const express = require('express')
const { createDesignation, getDesignations, getDesignationById, updateDesignation, deleteDesignation } = require('../controllers/designation')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateDesignation, validateUpdateDesignation } = require('../validators/organizationValidator')
const { ROLES } = require('../config/constants')

const router = express.Router()
const adminOrHr = authorizeRoles(ROLES.ADMIN, ROLES.HR)

router.use(verifyJWT)

router.post('/', adminOrHr, validate(validateCreateDesignation), createDesignation)
router.get('/', getDesignations)
router.get('/:id', getDesignationById)
router.patch('/:id', adminOrHr, validate(validateUpdateDesignation), updateDesignation)
router.delete('/:id', adminOrHr, deleteDesignation)

module.exports = router
