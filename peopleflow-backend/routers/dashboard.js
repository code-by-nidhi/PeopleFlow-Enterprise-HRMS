const express = require('express')
const { getDashboard } = require('../controllers/dashboard')
const verifyJWT = require('../middleware/verifyJWT')

const router = express.Router()

// Response shape depends on the logged-in user's role
router.get('/', verifyJWT, getDashboard)

module.exports = router
