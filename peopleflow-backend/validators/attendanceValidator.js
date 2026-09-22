const mongoose = require('mongoose')
const { ROLES } = require('../config/constants')
const { isValidDate, isValidTimeZone } = require('../utils/dates')

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const CODE_PATTERN = /^[A-Za-z0-9-]{2,20}$/
const CORRECTION_ROLES = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER]
// Manual times may not be set in the future (small allowance for clock drift)
const FUTURE_TOLERANCE_MS = 60 * 1000

const isNumberInRange = (value, min, max) => {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
    return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
}

const validateOffice = (partial) => ({ name, code, address, location, radiusMeters, timezone, qrTtlSeconds, maxAccuracyMeters, rules, correctionRoles, isActive }) => {
    if (!partial && (!name || !code || !location)) return 'Office name, code and location are required'
    if (name !== undefined && (String(name).trim().length < 2 || String(name).trim().length > 80)) return 'Office name must be 2-80 characters'
    if (code !== undefined && !CODE_PATTERN.test(String(code).trim())) return 'Office code may contain letters, numbers and - (2-20 characters)'
    if (address !== undefined && String(address).length > 200) return 'Address must be under 200 characters'
    if (location !== undefined) {
        if (!location || typeof location !== 'object') return 'Office location is required'
        if (!isNumberInRange(location.latitude, -90, 90)) return 'Latitude must be a number between -90 and 90'
        if (!isNumberInRange(location.longitude, -180, 180)) return 'Longitude must be a number between -180 and 180'
    }
    if (radiusMeters !== undefined && !isNumberInRange(radiusMeters, 10, 5000)) return 'Geofence radius must be between 10 and 5000 metres'
    if (timezone !== undefined && !isValidTimeZone(String(timezone))) return 'Unknown time zone'
    if (qrTtlSeconds !== undefined && !isNumberInRange(qrTtlSeconds, 15, 300)) return 'QR expiry must be between 15 and 300 seconds'
    if (maxAccuracyMeters !== undefined && !isNumberInRange(maxAccuracyMeters, 10, 500)) return 'Maximum GPS accuracy must be between 10 and 500 metres'
    if (rules !== undefined) {
        if (!rules || typeof rules !== 'object') return 'Invalid attendance rules'
        if (rules.officeStart !== undefined && !TIME_PATTERN.test(rules.officeStart)) return 'Office start time must be HH:MM'
        if (rules.halfDayHours !== undefined && !isNumberInRange(rules.halfDayHours, 1, 12)) return 'Half-day threshold must be between 1 and 12 hours'
        if (rules.maxShiftHours !== undefined && !isNumberInRange(rules.maxShiftHours, 4, 24)) return 'Maximum shift length must be between 4 and 24 hours'
    }
    if (correctionRoles !== undefined) {
        if (!Array.isArray(correctionRoles) || correctionRoles.some((role) => !CORRECTION_ROLES.includes(role))) {
            return `Correction roles must be any of: ${CORRECTION_ROLES.join(', ')}`
        }
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') return 'isActive must be true or false'
    return null
}

const validateReason = (reason) => {
    const text = String(reason || '').trim()
    if (text.length < 5) return 'Please give a reason for the correction (at least 5 characters)'
    if (text.length > 500) return 'Reason must be under 500 characters'
    return null
}

const validateTimes = (checkIn, checkOut) => {
    const now = Date.now() + FUTURE_TOLERANCE_MS
    if (checkIn !== undefined && (!isValidDate(checkIn) || new Date(checkIn).getTime() > now)) return 'Check-in must be a valid time that is not in the future'
    if (checkOut !== undefined && checkOut !== null && (!isValidDate(checkOut) || new Date(checkOut).getTime() > now)) {
        return 'Check-out must be a valid time that is not in the future'
    }
    return null
}

const validateCorrection = ({ checkIn, checkOut, status, reason }) => {
    if (checkIn === undefined && checkOut === undefined && status === undefined) return 'Nothing to correct'
    if (status !== undefined && !['present', 'late', 'half-day'].includes(status)) return 'Invalid status'
    return validateTimes(checkIn, checkOut) || validateReason(reason)
}

const validateManualAttendance = ({ userId, officeId, checkIn, checkOut, status, reason }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return 'Select an employee'
    if (officeId !== undefined && officeId !== '' && !mongoose.Types.ObjectId.isValid(officeId)) return 'Invalid office'
    if (checkIn === undefined) return 'Check-in time is required'
    if (status !== undefined && !['present', 'late', 'half-day'].includes(status)) return 'Invalid status'
    return validateTimes(checkIn, checkOut) || validateReason(reason)
}

module.exports = {
    validateCreateOffice: validateOffice(false),
    validateUpdateOffice: validateOffice(true),
    validateCorrection,
    validateManualAttendance
}
