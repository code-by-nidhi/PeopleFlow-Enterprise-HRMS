const express = require('express')
const { uploadProfilePicture, uploadResume, uploadDocument, deleteDocument } = require('../controllers/upload')
const verifyJWT = require('../middleware/verifyJWT')
const { uploadImage, uploadDocument: parseDocument } = require('../middleware/upload')

const router = express.Router()

router.use(verifyJWT)

router.post('/profile', uploadImage, uploadProfilePicture)
router.post('/resume', parseDocument, uploadResume)
router.post('/documents', parseDocument, uploadDocument)
router.delete('/:id', deleteDocument)

module.exports = router
