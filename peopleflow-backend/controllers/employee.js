const bcryptjs = require('bcryptjs')
const Employee = require('../models/employee')
const User = require('../models/user')
const Department = require('../models/department')
const Designation = require('../models/designation')
const AppError = require('../utils/AppError')
const generateEmployeeId = require('../utils/generateEmployeeId')
const generateRandomPassword = require('../utils/generateRandomPassword')
const { isEmailConfigured } = require('../utils/sendEmail')
const { sendSuccess, getPagination, escapeRegex } = require('../utils/apiResponse')
const { addJob } = require('../queues')
const { notifyUsers } = require('../services/notification')
const { deleteUserCascade, credentialsEmail } = require('../services/userLifecycle')
const cache = require('../services/cache')
const { ROLES, MANAGEMENT_ROLES, CACHE_TTL } = require('../config/constants')

const EDITABLE_FIELDS = ['firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'address', 'department', 'designation', 'manager', 'employmentType', 'status', 'joiningDate']
const SORTABLE_FIELDS = ['employeeId', 'firstName', 'joiningDate', 'createdAt']

const populateEmployee = (query) => query
    .populate('user', 'email role isActive avatar lastLoginAt')
    .populate('department', 'name')
    .populate('designation', 'title')
    .populate('manager', 'name email')

const invalidateEmployeeCaches = () =>
    cache.invalidate(cache.CACHE_KEYS.EMPLOYEES, cache.CACHE_KEYS.DASHBOARD, cache.CACHE_KEYS.DEPARTMENTS, cache.CACHE_KEYS.DESIGNATIONS)

const assertOrganisationRefs = async ({ department, designation, manager }) => {
    const [dept, desig, mgr] = await Promise.all([
        department ? Department.exists({ _id: department }) : true,
        designation ? Designation.exists({ _id: designation }) : true,
        manager ? User.exists({ _id: manager, role: { $in: MANAGEMENT_ROLES } }) : true
    ])
    if (!dept) throw new AppError('Department not found', 404)
    if (!desig) throw new AppError('Designation not found', 404)
    if (!mgr) throw new AppError('Manager must be an admin, HR or manager account', 400)
}

const pickSalary = (salary = {}) => Object.fromEntries(
    ['basic', 'hra', 'allowances', 'deductions']
        .filter((key) => salary[key] !== undefined && salary[key] !== '')
        .map((key) => [key, Number(salary[key])])
)

const createEmployee = async (req, res) => {
    const body = req.body
    const email = body.email.toLowerCase().trim()

    if (await User.exists({ email })) throw new AppError('A user with this email already exists', 409)
    await assertOrganisationRefs(body)

    const passwordProvided = Boolean(body.password)
    const password = passwordProvided ? body.password : generateRandomPassword()
    const name = `${body.firstName.trim()} ${body.lastName.trim()}`

    const user = await User.create({
        name,
        email,
        password: await bcryptjs.hash(password, 10),
        role: ROLES.EMPLOYEE,
        mustChangePassword: true
    })

    let employee
    try {
        const fields = Object.fromEntries(EDITABLE_FIELDS.filter((key) => body[key] !== undefined && body[key] !== '').map((key) => [key, body[key]]))
        employee = await Employee.create({
            ...fields,
            user: user._id,
            employeeId: await generateEmployeeId(),
            salary: pickSalary(body.salary)
        })
    } catch (error) {
        // Never leave a login account without its employee profile
        await User.deleteOne({ _id: user._id })
        throw error
    }

    await addJob('email', credentialsEmail({ name, email, password, role: 'employee' }))
    await notifyUsers([user._id], {
        title: 'Welcome to PeopleFlow',
        message: `Your employee profile (${employee.employeeId}) is ready. Complete your profile and change your password.`,
        type: 'account',
        link: '/profile'
    })
    await invalidateEmployeeCaches()

    const populated = await populateEmployee(Employee.findById(employee._id))
    return sendSuccess(res, {
        statusCode: 201,
        message: 'Employee created successfully',
        data: { employee: populated, ...(!passwordProvided && !isEmailConfigured() ? { temporaryPassword: password } : {}) }
    })
}

const getEmployees = async (req, res) => {
    const { q, search, department, designation, status, employmentType, sort } = req.query
    const { page, skip, limit, buildMeta } = getPagination(req.query)
    const term = (q || search || '').trim()

    const cacheKey = `${cache.CACHE_KEYS.EMPLOYEES}${JSON.stringify({ term, department, designation, status, employmentType, sort, page, limit })}`

    const result = await cache.remember(cacheKey, CACHE_TTL.LISTS, async () => {
        const filter = {}
        if (department) filter.department = department
        if (designation) filter.designation = designation
        if (status) filter.status = status
        if (employmentType) filter.employmentType = employmentType

        if (term) {
            const pattern = new RegExp(escapeRegex(term), 'i')
            const matchingUsers = await User.find({ email: pattern }).select('_id').lean()
            filter.$or = [
                { firstName: pattern },
                { lastName: pattern },
                { employeeId: pattern },
                { user: { $in: matchingUsers.map((u) => u._id) } }
            ]
            // "Rahul Sharma" should match first + last name together
            const [first, ...rest] = term.split(/\s+/)
            if (rest.length) {
                filter.$or.push({ firstName: new RegExp(escapeRegex(first), 'i'), lastName: new RegExp(escapeRegex(rest.join(' ')), 'i') })
            }
        }

        const sortField = SORTABLE_FIELDS.includes(String(sort).replace(/^-/, '')) ? sort : '-createdAt'

        const [employees, total] = await Promise.all([
            populateEmployee(Employee.find(filter).sort(sortField).skip(skip).limit(limit)),
            Employee.countDocuments(filter)
        ])
        return { data: employees.map((e) => e.toJSON()), meta: buildMeta(total) }
    })

    return sendSuccess(res, result)
}

const findAccessibleEmployee = async (req) => {
    const employee = await populateEmployee(Employee.findById(req.params.id))
    if (!employee) throw new AppError('Employee not found', 404)

    const isSelf = employee.user?._id.equals(req.user._id)
    if (!isSelf && !MANAGEMENT_ROLES.includes(req.user.role)) {
        throw new AppError('You can only view your own profile', 403)
    }
    return employee
}

const getEmployeeById = async (req, res) => {
    const employee = await findAccessibleEmployee(req)
    return sendSuccess(res, { data: employee })
}

const getMyProfile = async (req, res) => {
    const employee = await populateEmployee(Employee.findOne({ user: req.user._id }))
    if (!employee) throw new AppError('No employee profile is linked to your account', 404)
    return sendSuccess(res, { data: employee })
}

const updateEmployee = async (req, res) => {
    const body = req.body
    const employee = await Employee.findById(req.params.id)
    if (!employee) throw new AppError('Employee not found', 404)

    await assertOrganisationRefs(body)

    EDITABLE_FIELDS.forEach((key) => {
        if (body[key] === undefined) return
        employee[key] = body[key] === '' ? undefined : body[key]
    })
    if (body.salary) employee.salary = { ...employee.salary.toObject(), ...pickSalary(body.salary) }
    // Validate before touching the linked account so a bad payload changes nothing
    await employee.validate()

    const user = await User.findById(employee.user)
    if (user) {
        user.name = `${employee.firstName} ${employee.lastName}`
        if (body.email && body.email.toLowerCase() !== user.email) {
            if (await User.exists({ email: body.email.toLowerCase(), _id: { $ne: user._id } })) {
                throw new AppError('A user with this email already exists', 409)
            }
            user.email = body.email
        }
        if (body.status !== undefined) {
            user.isActive = body.status !== 'inactive'
            if (!user.isActive) user.refreshToken = null
        }
        await user.save()
    }

    await employee.save()
    await invalidateEmployeeCaches()

    const populated = await populateEmployee(Employee.findById(employee._id))
    return sendSuccess(res, { message: 'Employee updated successfully', data: populated })
}

const deleteEmployee = async (req, res) => {
    const employee = await Employee.findById(req.params.id)
    if (!employee) throw new AppError('Employee not found', 404)

    await deleteUserCascade(employee.user)
    return sendSuccess(res, { message: 'Employee deleted successfully' })
}

const generateSalarySlip = async (req, res) => {
    const now = new Date()
    const month = Number(req.body.month || now.getMonth() + 1)
    const year = Number(req.body.year || now.getFullYear())

    if (!Number.isInteger(month) || month < 1 || month > 12) throw new AppError('Month must be between 1 and 12', 400)
    if (!Number.isInteger(year) || year < 2000 || year > now.getFullYear() + 1) throw new AppError('Invalid year', 400)
    if (!(await Employee.exists({ _id: req.params.id }))) throw new AppError('Employee not found', 404)

    await addJob('salary-slip', { employeeId: req.params.id, month, year })
    return sendSuccess(res, { statusCode: 202, message: 'Salary slip generation queued. The employee will be notified when it is ready.' })
}

module.exports = {
    createEmployee,
    getEmployees,
    getEmployeeById,
    getMyProfile,
    updateEmployee,
    deleteEmployee,
    generateSalarySlip
}
