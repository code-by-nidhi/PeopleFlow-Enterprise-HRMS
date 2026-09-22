const express = require('express')
const {
    createEmployee,
    getEmployees,
    getEmployeeById,
    getMyProfile,
    updateEmployee,
    deleteEmployee,
    generateSalarySlip
} = require('../controllers/employee')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateEmployee, validateUpdateEmployee } = require('../validators/employeeValidator')
const { ROLES, MANAGEMENT_ROLES } = require('../config/constants')

const router = express.Router()
const adminOrHr = authorizeRoles(ROLES.ADMIN, ROLES.HR)

router.use(verifyJWT)

router.post('/', adminOrHr, validate(validateCreateEmployee), createEmployee)
router.get('/', authorizeRoles(...MANAGEMENT_ROLES), getEmployees)
// Static paths must be registered before /:id
router.get('/search', adminOrHr, getEmployees)
router.get('/profile/me', getMyProfile)
router.get('/:id', getEmployeeById)
router.patch('/:id', adminOrHr, validate(validateUpdateEmployee), updateEmployee)
router.delete('/:id', authorizeRoles(ROLES.ADMIN), deleteEmployee)
router.post('/:id/salary-slip', adminOrHr, generateSalarySlip)

module.exports = router
