const multer = require('multer')
const AppError = require('../utils/AppError')

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...IMAGE_TYPES
]

const createUploader = (allowedTypes, maxSizeMb) => multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) return cb(null, true)
        cb(new AppError(`Unsupported file type: ${file.mimetype}`, 400))
    }
})

module.exports = {
    uploadImage: createUploader(IMAGE_TYPES, 5).single('file'),
    uploadDocument: createUploader(DOCUMENT_TYPES, 10).single('file')
}
