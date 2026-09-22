const bcryptjs = require('bcryptjs')
const User = require('../models/user')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const generateRandomPassword = require('../utils/generateRandomPassword')
const { isEmailConfigured } = require('../utils/sendEmail')
const { sendSuccess, getPagination, escapeRegex } = require('../utils/apiResponse')
const { addJob } = require('../queues')
const { deleteUserCascade, credentialsEmail } = require('../services/userLifecycle')
const cache = require('../services/cache')
const { ROLES } = require('../config/constants')

const createUser = async (req, res) => {
    const { name, email, role } = req.body

    // HR may provision manager accounts; only admins can create admins and HR
    if (req.user.role === ROLES.HR && role !== ROLES.MANAGER) {
        throw new AppError('HR can only create manager accounts', 403)
    }

    if (await User.exists({ email: email.toLowerCase() })) {
        throw new AppError('A user with this email already exists', 409)
    }

    const temporaryPassword = generateRandomPassword()
    const user = await User.create({
        name: name.trim(),
        email,
        role,
        password: await bcryptjs.hash(temporaryPassword, 10),
        mustChangePassword: true
    })

    await addJob('email', credentialsEmail({ name: user.name, email: user.email, password: temporaryPassword, role }))
    await cache.invalidate(cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, {
        statusCode: 201,
        message: 'User created successfully',
        // Without SMTP the admin needs the password to hand it over manually
        data: { user, ...(isEmailConfigured() ? {} : { temporaryPassword }) }
    })
}

const getAllUsers = async (req, res) => {
    const { search, role, status } = req.query
    const { skip, limit, buildMeta } = getPagination(req.query)

    const filter = {}
    if (role) filter.role = role
    if (status === 'active') filter.isActive = true
    if (status === 'inactive') filter.isActive = false
    if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i')
        filter.$or = [{ name: pattern }, { email: pattern }]
    }

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter)
    ])

    return sendSuccess(res, { data: users, meta: buildMeta(total) })
}

const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id)
    if (!user) throw new AppError('User not found', 404)

    const employee = await Employee.findOne({ user: user._id })
        .select('employeeId department designation status')
        .populate('department', 'name')
        .populate('designation', 'title')

    return sendSuccess(res, { data: { user, employee } })
}

const updateUser = async (req, res) => {
    const { name, email, role } = req.body
    const user = await User.findById(req.params.id)
    if (!user) throw new AppError('User not found', 404)

    if (role !== undefined && role !== user.role) {
        if (user._id.equals(req.user._id)) throw new AppError('You cannot change your own role', 400)
        if (role === ROLES.EMPLOYEE && !(await Employee.exists({ user: user._id }))) {
            throw new AppError('Employee accounts must be created from the Employees module', 400)
        }
        user.role = role
        // Force re-login so the new role is reflected in the access token
        user.refreshToken = null
    }

    if (email !== undefined && email.toLowerCase() !== user.email) {
        if (await User.exists({ email: email.toLowerCase(), _id: { $ne: user._id } })) {
            throw new AppError('A user with this email already exists', 409)
        }
        user.email = email
    }

    if (name !== undefined) user.name = name.trim()

    await user.save()
    await cache.invalidate(cache.CACHE_KEYS.EMPLOYEES, cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { message: 'User updated successfully', data: user })
}

const changeUserStatus = async (req, res) => {
    const { isActive } = req.body
    if (typeof isActive !== 'boolean') throw new AppError('isActive must be true or false', 400)
    if (req.params.id === String(req.user._id)) throw new AppError('You cannot change your own status', 400)

    const update = isActive ? { isActive } : { isActive, $unset: { refreshToken: 1 } }
    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
    if (!user) throw new AppError('User not found', 404)

    await Employee.updateOne({ user: user._id }, { status: isActive ? 'active' : 'inactive' })
    await cache.invalidate(cache.CACHE_KEYS.EMPLOYEES, cache.CACHE_KEYS.DASHBOARD)

    return sendSuccess(res, { message: `User ${isActive ? 'activated' : 'deactivated'} successfully`, data: user })
}

const deleteUser = async (req, res) => {
    const user = await User.findById(req.params.id)
    if (!user) throw new AppError('User not found', 404)
    if (user._id.equals(req.user._id)) throw new AppError('You cannot delete your own account', 400)

    if (user.role === ROLES.ADMIN && (await User.countDocuments({ role: ROLES.ADMIN })) <= 1) {
        throw new AppError('Cannot delete the last admin account', 400)
    }

    await deleteUserCascade(user._id)
    return sendSuccess(res, { message: 'User deleted successfully' })
}

/** Lightweight list for assignee / manager pickers. */
const getUserOptions = async (req, res) => {
    const filter = { isActive: true }
    if (req.query.roles) filter.role = { $in: String(req.query.roles).split(',') }

    const users = await User.find(filter).select('name email role').sort({ name: 1 }).lean()
    return sendSuccess(res, { data: users })
}

module.exports = { createUser, getAllUsers, getUserById, updateUser, changeUserStatus, deleteUser, getUserOptions }
