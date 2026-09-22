const express = require('express')
const { createTask, getTasks, getMyTasks, getTaskById, updateTask, deleteTask } = require('../controllers/task')
const verifyJWT = require('../middleware/verifyJWT')
const authorizeRoles = require('../middleware/authorizeRoles')
const validate = require('../middleware/validate')
const { validateCreateTask, validateUpdateTask } = require('../validators/workflowValidator')
const { MANAGEMENT_ROLES } = require('../config/constants')

const router = express.Router()
const managers = authorizeRoles(...MANAGEMENT_ROLES)

router.use(verifyJWT)

router.post('/', managers, validate(validateCreateTask), createTask)
router.get('/', managers, getTasks)
router.get('/me', getMyTasks)
router.get('/:id', getTaskById)
router.patch('/:id', validate(validateUpdateTask), updateTask)
router.delete('/:id', managers, deleteTask)

module.exports = router
