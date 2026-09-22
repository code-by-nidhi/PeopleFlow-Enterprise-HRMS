const mongoose = require('mongoose')
const User = require('../models/user')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { uploadFile, deleteFile } = require('../services/storage')
const cache = require('../services/cache')
const { ROLES } = require('../config/constants')

const canManageFiles = (user) => [ROLES.ADMIN, ROLES.HR].includes(user.role)
const DOCUMENT_TYPES = ['id-proof', 'salary-slip', 'other']

const requireFile = (req) => {
    if (!req.file) throw new AppError('Please attach a file in the "file" field', 400)
    return req.file
}

/** Admin/HR may target another employee with ?employeeId=; everyone else targets themselves. */
const resolveEmployee = async (req) => {
    const { employeeId } = req.query
    if (employeeId && employeeId !== 'me') {
        if (!canManageFiles(req.user)) throw new AppError('You can only upload your own documents', 403)
        if (!mongoose.Types.ObjectId.isValid(employeeId)) throw new AppError('Invalid employee id', 400)
        const employee = await Employee.findById(employeeId)
        if (!employee) throw new AppError('Employee not found', 404)
        return employee
    }
    const employee = await Employee.findOne({ user: req.user._id })
    if (!employee) throw new AppError('No employee profile is linked to your account', 404)
    return employee
}

const uploadProfilePicture = async (req, res) => {
    const file = requireFile(req)

    let targetId = req.user._id
    if (req.query.userId && req.query.userId !== String(req.user._id)) {
        if (!canManageFiles(req.user)) throw new AppError('You can only change your own profile picture', 403)
        targetId = req.query.userId
    }

    const user = await User.findById(targetId)
    if (!user) throw new AppError('User not found', 404)

    const previous = user.avatar?.publicId
    user.avatar = await uploadFile(file, 'avatars')
    await user.save()
    await deleteFile(previous)
    await cache.invalidate(cache.CACHE_KEYS.EMPLOYEES)

    return sendSuccess(res, { message: 'Profile picture updated', data: user.avatar })
}

const uploadResume = async (req, res) => {
    const file = requireFile(req)
    const employee = await resolveEmployee(req)

    const previous = employee.resume?.publicId
    employee.resume = { name: file.originalname, type: 'resume', ...(await uploadFile(file, 'resumes')) }
    await employee.save()
    await deleteFile(previous)

    return sendSuccess(res, { message: 'Resume uploaded', data: employee.resume })
}

const uploadDocument = async (req, res) => {
    const file = requireFile(req)
    const employee = await resolveEmployee(req)

    const type = DOCUMENT_TYPES.includes(req.body?.type) ? req.body.type : 'other'
    const name = String(req.body?.name || file.originalname).trim().slice(0, 100)

    employee.documents.push({ name, type, ...(await uploadFile(file, 'documents')) })
    await employee.save()

    return sendSuccess(res, { statusCode: 201, message: 'Document uploaded', data: employee.documents.at(-1) })
}

const deleteDocument = async (req, res) => {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid document id', 400)

    const employee = await Employee.findOne({ $or: [{ 'documents._id': id }, { 'resume._id': id }] })
    if (!employee) throw new AppError('Document not found', 404)

    if (!employee.user.equals(req.user._id) && !canManageFiles(req.user)) {
        throw new AppError('You cannot delete this document', 403)
    }

    let publicId
    if (employee.resume?._id?.equals(id)) {
        publicId = employee.resume.publicId
        employee.resume = undefined
    } else {
        const doc = employee.documents.id(id)
        publicId = doc.publicId
        doc.deleteOne()
    }

    await employee.save()
    await deleteFile(publicId)

    return sendSuccess(res, { message: 'Document deleted' })
}

module.exports = { uploadProfilePicture, uploadResume, uploadDocument, deleteDocument }
