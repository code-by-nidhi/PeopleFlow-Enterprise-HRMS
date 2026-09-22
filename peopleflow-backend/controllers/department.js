const Department = require('../models/department')
const Designation = require('../models/designation')
const Employee = require('../models/employee')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const cache = require('../services/cache')
const { CACHE_TTL } = require('../config/constants')

const CASE_INSENSITIVE = { locale: 'en', strength: 2 }

const invalidate = () => cache.invalidate(cache.CACHE_KEYS.DEPARTMENTS, cache.CACHE_KEYS.DESIGNATIONS, cache.CACHE_KEYS.DASHBOARD, cache.CACHE_KEYS.EMPLOYEES)

const assertUniqueName = async (name, excludeId) => {
    const filter = { name: name.trim() }
    if (excludeId) filter._id = { $ne: excludeId }
    if (await Department.findOne(filter).collation(CASE_INSENSITIVE).select('_id').lean()) {
        throw new AppError('Department already exists', 409)
    }
}

const createDepartment = async (req, res) => {
    const { name, description, head } = req.body
    await assertUniqueName(name)

    const department = await Department.create({ name: name.trim(), description, head: head || undefined })
    await invalidate()
    return sendSuccess(res, { statusCode: 201, message: 'Department created successfully', data: department })
}

const getDepartments = async (req, res) => {
    const departments = await cache.remember(`${cache.CACHE_KEYS.DEPARTMENTS}all`, CACHE_TTL.LISTS, async () => {
        const [list, employeeCounts, designationCounts] = await Promise.all([
            Department.find().populate('head', 'name email').sort({ name: 1 }).lean(),
            Employee.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
            Designation.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }])
        ])
        const toMap = (rows) => new Map(rows.map((row) => [String(row._id), row.count]))
        const employees = toMap(employeeCounts)
        const designations = toMap(designationCounts)

        return list.map((dept) => ({
            ...dept,
            employeeCount: employees.get(String(dept._id)) || 0,
            designationCount: designations.get(String(dept._id)) || 0
        }))
    })

    return sendSuccess(res, { data: departments })
}

const getDepartmentById = async (req, res) => {
    const department = await Department.findById(req.params.id).populate('head', 'name email').lean()
    if (!department) throw new AppError('Department not found', 404)

    const [employeeCount, designations] = await Promise.all([
        Employee.countDocuments({ department: department._id }),
        Designation.find({ department: department._id }).select('title').sort({ title: 1 }).lean()
    ])

    return sendSuccess(res, { data: { ...department, employeeCount, designations } })
}

const updateDepartment = async (req, res) => {
    const { name, description, head, isActive } = req.body
    const department = await Department.findById(req.params.id)
    if (!department) throw new AppError('Department not found', 404)

    if (name !== undefined) {
        await assertUniqueName(name, department._id)
        department.name = name.trim()
    }
    if (description !== undefined) department.description = description
    if (head !== undefined) department.head = head || undefined
    if (typeof isActive === 'boolean') department.isActive = isActive

    await department.save()
    await invalidate()
    return sendSuccess(res, { message: 'Department updated successfully', data: department })
}

const deleteDepartment = async (req, res) => {
    const department = await Department.findById(req.params.id)
    if (!department) throw new AppError('Department not found', 404)

    const employeeCount = await Employee.countDocuments({ department: department._id })
    if (employeeCount) {
        throw new AppError(`Cannot delete: ${employeeCount} employee(s) still belong to this department`, 409)
    }

    await Promise.all([
        department.deleteOne(),
        Designation.updateMany({ department: department._id }, { $unset: { department: 1 } })
    ])
    await invalidate()
    return sendSuccess(res, { message: 'Department deleted successfully' })
}

module.exports = { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment }
