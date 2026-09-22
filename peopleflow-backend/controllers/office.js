const Office = require('../models/office')
const AppError = require('../utils/AppError')
const { sendSuccess } = require('../utils/apiResponse')
const { issueQrToken } = require('../services/officeQr')
const { requestContext, recordAudit } = require('../services/attendanceAudit')
const { AUDIT_ACTIONS, ROLES } = require('../config/constants')

const toNumber = (value) => (value === undefined ? undefined : Number(value))

/** Whitelists and normalises editable fields so nothing else can be mass-assigned. */
const buildOfficePayload = (body) => {
    const payload = {}
    if (body.name !== undefined) payload.name = String(body.name).trim()
    if (body.code !== undefined) payload.code = String(body.code).trim().toUpperCase()
    if (body.address !== undefined) payload.address = String(body.address).trim()
    if (body.location !== undefined) {
        payload.location = { latitude: Number(body.location.latitude), longitude: Number(body.location.longitude) }
    }
    if (body.radiusMeters !== undefined) payload.radiusMeters = toNumber(body.radiusMeters)
    if (body.timezone !== undefined) payload.timezone = String(body.timezone)
    if (body.qrTtlSeconds !== undefined) payload.qrTtlSeconds = toNumber(body.qrTtlSeconds)
    if (body.maxAccuracyMeters !== undefined) payload.maxAccuracyMeters = toNumber(body.maxAccuracyMeters)
    if (body.rules !== undefined) {
        const { officeStart, halfDayHours, maxShiftHours } = body.rules
        if (officeStart !== undefined) payload['rules.officeStart'] = officeStart
        if (halfDayHours !== undefined) payload['rules.halfDayHours'] = toNumber(halfDayHours)
        if (maxShiftHours !== undefined) payload['rules.maxShiftHours'] = toNumber(maxShiftHours)
    }
    if (body.correctionRoles !== undefined) {
        // Admins can always correct attendance
        payload.correctionRoles = [...new Set([ROLES.ADMIN, ...body.correctionRoles])]
    }
    if (body.isActive !== undefined) payload.isActive = body.isActive
    return payload
}

// Nested dot-paths (rules.x) must be expanded for create()
const expand = (payload) => {
    const doc = {}
    Object.entries(payload).forEach(([key, value]) => {
        if (!key.includes('.')) {
            doc[key] = value
            return
        }
        const [parent, child] = key.split('.')
        doc[parent] = { ...(doc[parent] || {}), [child]: value }
    })
    return doc
}

const ensureUniqueCode = async (code, excludeId) => {
    if (!code) return
    const clash = await Office.exists({ code, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    if (clash) throw new AppError('An office with this code already exists', 409)
}

const getOffices = async (req, res) => {
    const filter = {}
    if (req.query.status === 'active') filter.isActive = true
    if (req.query.status === 'inactive') filter.isActive = false
    const offices = await Office.find(filter).sort({ isActive: -1, name: 1 }).populate('updatedBy', 'name').lean()
    return sendSuccess(res, { data: offices })
}

const getOfficeById = async (req, res) => {
    const office = await Office.findById(req.params.id).lean()
    if (!office) throw new AppError('Office not found', 404)
    return sendSuccess(res, { data: office })
}

const createOffice = async (req, res) => {
    const payload = buildOfficePayload(req.body)
    await ensureUniqueCode(payload.code)

    const office = await Office.create({ ...expand(payload), createdBy: req.user._id, updatedBy: req.user._id })
    await recordAudit({
        performedBy: req.user._id,
        office: office._id,
        action: AUDIT_ACTIONS.OFFICE_CREATED,
        ...requestContext(req),
        metadata: { office: office.toObject() }
    })
    return sendSuccess(res, { statusCode: 201, message: 'Office created', data: office })
}

const updateOffice = async (req, res) => {
    const office = await Office.findById(req.params.id)
    if (!office) throw new AppError('Office not found', 404)

    const payload = buildOfficePayload(req.body)
    await ensureUniqueCode(payload.code, office._id)

    const before = office.toObject()
    office.set({ ...payload, updatedBy: req.user._id })
    await office.save()

    // Store only the fields that changed, before and after
    const changed = Object.keys(payload)
    const pick = (doc) => Object.fromEntries(changed.map((path) => [path, path.split('.').reduce((v, k) => v?.[k], doc)]))
    await recordAudit({
        performedBy: req.user._id,
        office: office._id,
        action: AUDIT_ACTIONS.OFFICE_UPDATED,
        ...requestContext(req),
        metadata: { before: pick(before), after: pick(office.toObject()) }
    })
    return sendSuccess(res, { message: 'Office updated', data: office })
}

/** Issues the next QR code for an office kiosk. */
const generateOfficeQr = async (req, res) => {
    const office = await Office.findById(req.params.id)
    if (!office) throw new AppError('Office not found', 404)
    if (!office.isActive) throw new AppError('This office is inactive', 409)

    // Only the rendered image leaves the server; the raw token is never sent as text
    // eslint-disable-next-line no-unused-vars
    const { payload, ...qr } = await issueQrToken(office, req.user._id)
    return sendSuccess(res, {
        statusCode: 201,
        message: 'QR code issued',
        data: {
            ...qr,
            serverTime: new Date(),
            office: { _id: office._id, name: office.name, code: office.code, timezone: office.timezone }
        }
    })
}

module.exports = { getOffices, getOfficeById, createOffice, updateOffice, generateOfficeQr }
