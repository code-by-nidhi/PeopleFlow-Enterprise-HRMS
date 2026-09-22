const Designation = require('../models/designation')
const Department = require('../models/department')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const cache = require('../services/cache')
const { CACHE_TTL } = require('../config/constants')

const CASE_INSENSITIVE = { locale: 'en', strength: 2 }

const invalidate = () => cache.invalidate(cache.CACHE_KEYS.DESIGNATIONS, cache.CACHE_KEYS.DEPARTMENTS, cache.CACHE_KEYS.EMPLOYEES)

const assertValid = async ({ title, department }, excludeId) => {
    if (department && !(await Department.exists({ _id: department }))) {
        throw new AppError('Department not found', 404)
    }
    const filter = { title: title.trim(), department: department || null }
    if (excludeId) filter._id = { $ne: excludeId }
    if (await Designation.findOne(filter).collation(CASE_INSENSITIVE).select('_id').lean()) {
        throw new AppError('Designation already exists in this department', 409)
    }
}

const createDesignation = async (req, res) => {
    const { title, department, description, salaryRange } = req.body
    await assertValid({ title, department })

    const designation = await Designation.create({
        title: title.trim(),
        department: department || undefined,
        description,
        salaryRange
    })
    await invalidate()
    return sendSuccess(res, { statusCode: 201, message: 'Designation created successfully', data: designation })
}

const getDesignations = async (req, res) => {
    const department = req.query.department || 'all'

    const designations = await cache.remember(`${cache.CACHE_KEYS.DESIGNATIONS}${department}`, CACHE_TTL.LISTS, async () => {
        const filter = department === 'all' ? {} : { department }
        const [list, counts] = await Promise.all([
            Designation.find(filter).populate('department', 'name').sort({ title: 1 }).lean(),
            Employee.aggregate([{ $group: { _id: '$designation', count: { $sum: 1 } } }])
        ])
        const countMap = new Map(counts.map((row) => [String(row._id), row.count]))
        return list.map((d) => ({ ...d, employeeCount: countMap.get(String(d._id)) || 0 }))
    })

    return sendSuccess(res, { data: designations })
}

const getDesignationById = async (req, res) => {
    const designation = await Designation.findById(req.params.id).populate('department', 'name').lean()
    if (!designation) throw new AppError('Designation not found', 404)

    const employeeCount = await Employee.countDocuments({ designation: designation._id })
    return sendSuccess(res, { data: { ...designation, employeeCount } })
}

const updateDesignation = async (req, res) => {
    const { title, department, description, salaryRange, isActive } = req.body
    const designation = await Designation.findById(req.params.id)
    if (!designation) throw new AppError('Designation not found', 404)

    const nextTitle = title !== undefined ? title : designation.title
    const nextDepartment = department !== undefined ? department : designation.department
    if (title !== undefined || department !== undefined) {
        await assertValid({ title: nextTitle, department: nextDepartment }, designation._id)
    }

    designation.title = nextTitle.trim()
    designation.department = nextDepartment || undefined
    if (description !== undefined) designation.description = description
    if (salaryRange !== undefined) designation.salaryRange = salaryRange
    if (typeof isActive === 'boolean') designation.isActive = isActive

    await designation.save()
    await invalidate()
    return sendSuccess(res, { message: 'Designation updated successfully', data: designation })
}

const deleteDesignation = async (req, res) => {
    const designation = await Designation.findById(req.params.id)
    if (!designation) throw new AppError('Designation not found', 404)

    const employeeCount = await Employee.countDocuments({ designation: designation._id })
    if (employeeCount) {
        throw new AppError(`Cannot delete: ${employeeCount} employee(s) hold this designation`, 409)
    }

    await designation.deleteOne()
    await invalidate()
    return sendSuccess(res, { message: 'Designation deleted successfully' })
}

module.exports = { createDesignation, getDesignations, getDesignationById, updateDesignation, deleteDesignation }
