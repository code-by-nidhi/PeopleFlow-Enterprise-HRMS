const crypto = require('crypto')
const QRCode = require('qrcode')
const OfficeQrToken = require('../models/officeQrToken')
const AppError = require('../utils/AppError')
const { hashToken } = require('../utils/tokens')
const { emitToKiosk } = require('../sockets')

const QR_TYPE = 'peopleflow-attendance'
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const MAX_QR_LENGTH = 512

/**
 * Issues a fresh single-use token for an office kiosk and renders it as a QR image.
 * The QR carries only the office id, the random token and its expiry: nothing about
 * any employee. Only the token's hash is persisted.
 */
const issueQrToken = async (office, createdBy) => {
    const token = crypto.randomBytes(32).toString('base64url')
    const expiresAt = new Date(Date.now() + office.qrTtlSeconds * 1000)

    await OfficeQrToken.create({ office: office._id, tokenHash: hashToken(token), expiresAt, createdBy })

    const payload = JSON.stringify({ type: QR_TYPE, v: 1, officeId: String(office._id), token, expiresAt: expiresAt.toISOString() })
    const svg = await QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 })

    return {
        payload,
        image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
        expiresAt,
        ttlSeconds: office.qrTtlSeconds
    }
}

/** Extracts the token from a scanned QR string, or null if it is not one of ours. */
const parseQrPayload = (raw) => {
    if (typeof raw !== 'string' || !raw || raw.length > MAX_QR_LENGTH) return null
    try {
        const data = JSON.parse(raw)
        if (data?.type !== QR_TYPE || typeof data.token !== 'string' || !TOKEN_PATTERN.test(data.token)) return null
        return { token: data.token, officeId: typeof data.officeId === 'string' ? data.officeId : null }
    } catch {
        return null
    }
}

const QR_ERRORS = {
    QR_MISSING: ['Please scan the office QR code.', 400],
    QR_INVALID: ['This is not a valid office attendance QR code.', 403],
    QR_WRONG_OFFICE: ['This QR code belongs to a different office. Scan the code shown at the office you are in.', 403],
    QR_USED: ['This QR code has already been used. Scan the new code shown on the office screen.', 403],
    QR_EXPIRED: ['This QR code has expired. Scan the code currently shown on the office screen.', 403]
}

const qrError = (code) => new AppError(QR_ERRORS[code][0], QR_ERRORS[code][1], code)

/**
 * Atomically marks the token as used by this employee. The expiry, office and
 * "not yet consumed" checks are part of the same update, so two concurrent scans
 * of one code can never both succeed. Throws an AppError with a QR_* code.
 */
const consumeQrToken = async ({ raw, office, userId, action }) => {
    if (!raw) throw qrError('QR_MISSING')
    const parsed = parseQrPayload(raw)
    if (!parsed) throw qrError('QR_INVALID')

    const tokenHash = hashToken(parsed.token)
    const now = new Date()
    const consumed = await OfficeQrToken.findOneAndUpdate(
        { tokenHash, office: office._id, consumedAt: null, expiresAt: { $gt: now } },
        { $set: { consumedAt: now, consumedBy: userId, consumedFor: action } },
        { returnDocument: 'after' }
    )

    if (consumed) {
        // Tell the office screen to rotate straight away
        emitToKiosk(office._id, 'attendance:qr-consumed', { officeId: String(office._id) })
        return consumed
    }

    // Work out why, for the employee's message and the audit log
    const existing = await OfficeQrToken.findOne({ tokenHash }).select('office consumedAt expiresAt').lean()
    if (!existing) throw qrError('QR_INVALID')
    if (String(existing.office) !== String(office._id)) throw qrError('QR_WRONG_OFFICE')
    if (existing.consumedAt) throw qrError('QR_USED')
    throw qrError('QR_EXPIRED')
}

module.exports = { issueQrToken, parseQrPayload, consumeQrToken, QR_TYPE }
