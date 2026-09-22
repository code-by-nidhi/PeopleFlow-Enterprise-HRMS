const express = require('express')
const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notification')
const verifyJWT = require('../middleware/verifyJWT')

const router = express.Router()

router.use(verifyJWT)

router.get('/', getNotifications)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)
router.delete('/:id', deleteNotification)

module.exports = router
