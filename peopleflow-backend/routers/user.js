const express = require('express')
const { createUser, getAllUsers, getUserById, updateUser, changeUserStatus, deleteUser, getUserOptions } = require('../controllers/user')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateUser, validateUpdateUser } = require('../validators/userValidator')
const { ROLES, MANAGEMENT_ROLES } = require('../config/constants')

const router = express.Router()
const adminOnly = authorizeRoles(ROLES.ADMIN)

router.use(verifyJWT)

router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(validateCreateUser), createUser)
router.get('/', adminOnly, getAllUsers)
router.get('/options', authorizeRoles(...MANAGEMENT_ROLES), getUserOptions)
router.get('/:id', adminOnly, getUserById)
router.patch('/:id', adminOnly, validate(validateUpdateUser), updateUser)
router.patch('/:id/status', adminOnly, changeUserStatus)
router.delete('/:id', adminOnly, deleteUser)

module.exports = router
