const express = require('express')
const { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment } = require('../controllers/department')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateDepartment, validateUpdateDepartment } = require('../validators/organizationValidator')
const { ROLES } = require('../config/constants')

const router = express.Router()
const adminOrHr = authorizeRoles(ROLES.ADMIN, ROLES.HR)

router.use(verifyJWT)

router.post('/', adminOrHr, validate(validateCreateDepartment), createDepartment)
router.get('/', getDepartments)
router.get('/:id', getDepartmentById)
router.patch('/:id', adminOrHr, validate(validateUpdateDepartment), updateDepartment)
router.delete('/:id', adminOrHr, deleteDepartment)

module.exports = router
