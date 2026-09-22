/**
 * File storage: Cloudinary when credentials are configured, otherwise the local
 * uploads/ folder (served statically at /uploads).
 */
const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const cloudinary = require('cloudinary').v2

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

const useCloudinary = () =>
    Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

if (useCloudinary()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    })
}

const uploadToCloudinary = (buffer, folder, resourceType) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `peopleflow/${folder}`, resource_type: resourceType },
            (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: `${resourceType}:${result.public_id}` }))
        )
        stream.end(buffer)
    })

/**
 * @param {{ buffer: Buffer, originalname: string, mimetype: string }} file
 * @param {string} folder logical folder, e.g. "avatars"
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadFile = async (file, folder) => {
    if (useCloudinary()) {
        const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw'
        return uploadToCloudinary(file.buffer, folder, resourceType)
    }

    const ext = path.extname(file.originalname).toLowerCase()
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
    const dir = path.join(UPLOAD_DIR, folder)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, filename), file.buffer)
    const relative = `${folder}/${filename}`
    return { url: `/uploads/${relative}`, publicId: `local:${relative}` }
}

const deleteFile = async (publicId) => {
    if (!publicId) return
    try {
        if (publicId.startsWith('local:')) {
            const target = path.join(UPLOAD_DIR, publicId.slice('local:'.length))
            // Never allow a crafted id to escape the uploads folder
            if (target.startsWith(UPLOAD_DIR + path.sep)) await fs.unlink(target)
            return
        }
        if (useCloudinary()) {
            const [resourceType, id] = publicId.includes(':') ? publicId.split(/:(.+)/) : ['image', publicId]
            await cloudinary.uploader.destroy(id, { resource_type: resourceType })
        }
    } catch (error) {
        console.error('Storage: failed to delete file -', error.message)
    }
}

module.exports = { uploadFile, deleteFile, UPLOAD_DIR }
