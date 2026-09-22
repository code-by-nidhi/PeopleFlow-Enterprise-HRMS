const { describe, it, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const {
    startDatabase, stopDatabase, clearDatabase, createUser, createOffice, issueQr, api, insideFix, pointNorth,
    performAction, models
} = require('./helpers')

const { Attendance, AttendanceAuditLog, AttendanceVerification, OfficeQrToken, Employee } = models

const auditActions = async (userId) => (await AttendanceAuditLog.find({ user: userId }).sort({ createdAt: 1 }).lean()).map((e) => e.action)

describe('Verified attendance', () => {
    let office
    let hr

    before(startDatabase)
    after(stopDatabase)

    beforeEach(async () => {
        await clearDatabase()
        office = await createOffice()
        hr = await createUser('hr')
    })

    // -----------------------------------------------------------------------
    describe('normal flow', () => {
        it('checks in with GPS inside the geofence + a valid office QR, using the server clock', async () => {
            const { user, token } = await createUser()
            const before = Date.now()
            const { location, complete } = await performAction({ token, office, hrId: hr.user._id })
            const afterTime = Date.now()

            assert.equal(location.status, 201)
            assert.equal(location.body.data.office.code, office.code)
            assert.equal(complete.status, 201)

            const record = await Attendance.findById(complete.body.data._id).lean()
            assert.equal(String(record.user), String(user._id))
            assert.equal(String(record.office), String(office._id))
            assert.ok(record.checkIn.getTime() >= before && record.checkIn.getTime() <= afterTime, 'check-in time comes from the server')
            assert.equal(record.checkInVerification.status, 'verified')
            assert.equal(record.checkInVerification.method, 'geofence+qr')
            assert.ok(record.checkInLocation.distance <= 100)

            assert.deepEqual(await auditActions(user._id), ['CHECK_IN_ATTEMPT', 'CHECK_IN_SUCCESS'])
            const token_ = await OfficeQrToken.findById(record.checkInVerification.qrToken).lean()
            assert.equal(String(token_.consumedBy), String(user._id))
        })

        it('checks out and computes working hours from server timestamps', async () => {
            const { user, token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            // Pretend the shift started 5 hours ago
            await Attendance.updateOne({ user: user._id }, { $set: { checkIn: new Date(Date.now() - 5 * 36e5) } })

            const { complete } = await performAction({ token, action: 'check-out', office, hrId: hr.user._id })
            assert.equal(complete.status, 201)
            const record = await Attendance.findOne({ user: user._id }).lean()
            assert.ok(record.checkOut)
            assert.ok(Math.abs(record.workingHours - 5) < 0.05)
            assert.equal(record.checkOutVerification.status, 'verified')
        })

        it('marks a short shift as half day', async () => {
            const { user, token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            const { complete } = await performAction({ token, action: 'check-out', office, hrId: hr.user._id })
            assert.equal(complete.status, 201)
            assert.equal((await Attendance.findOne({ user: user._id })).status, 'half-day')
        })

        it('accepts a reading just inside the boundary', async () => {
            const { token } = await createUser()
            const { complete } = await performAction({ token, office, hrId: hr.user._id, fix: { ...pointNorth(95), accuracy: 5 } })
            assert.equal(complete.status, 201)
        })

        it('picks the nearest of several offices', async () => {
            const branch = await createOffice({ location: pointNorth(5000) })
            const { token } = await createUser()
            const fix = { ...pointNorth(5010), accuracy: 10 }
            const { location, complete } = await performAction({ token, office: branch, hrId: hr.user._id, fix })
            assert.equal(location.body.data.office.code, branch.code)
            assert.equal(complete.status, 201)
        })

        it('reports today\'s state', async () => {
            const { token } = await createUser()
            let res = await api(token).get('/api/attendance/today')
            assert.equal(res.body.data.canCheckIn, true)
            assert.equal(res.body.data.attendanceConfigured, true)

            await performAction({ token, office, hrId: hr.user._id })
            res = await api(token).get('/api/attendance/today')
            assert.equal(res.body.data.canCheckIn, false)
            assert.equal(res.body.data.canCheckOut, true)
        })
    })

    // -----------------------------------------------------------------------
    describe('geofence and GPS', () => {
        it('rejects a check-in from outside the office even if the client claims to be inside', async () => {
            const { user, token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', {
                action: 'check-in', ...pointNorth(2000), accuracy: 10, isInsideOffice: true, isInsideGeofence: true
            })
            assert.equal(res.status, 403)
            assert.equal(res.body.code, 'GEOFENCE_OUTSIDE')
            assert.match(res.body.message, /outside the office/)
            assert.doesNotMatch(res.body.message, /\d+\s?m/, 'no distances leaked to the employee')
            assert.equal(await AttendanceVerification.countDocuments(), 0)
            assert.equal(await Attendance.countDocuments(), 0)
            const failure = await AttendanceAuditLog.findOne({ user: user._id, action: 'GEOFENCE_VALIDATION_FAILED' }).lean()
            assert.equal(failure.reason, 'GEOFENCE_OUTSIDE')
            assert.ok(failure.metadata.distance > 1900)
        })

        it('asks the employee to move in when they are on the boundary within GPS error', async () => {
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...pointNorth(110), accuracy: 20 })
            assert.equal(res.status, 403)
            assert.equal(res.body.code, 'GEOFENCE_BOUNDARY')
        })

        it('rejects missing GPS data', async () => {
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in' })
            assert.equal(res.status, 400)
            assert.equal(res.body.code, 'GPS_MISSING')
        })

        it('rejects coordinates sent as strings or out of range', async () => {
            const { token } = await createUser()
            let res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', latitude: '31.326', longitude: '75.5762', accuracy: 10 })
            assert.equal(res.body.code, 'GPS_INVALID')
            res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', latitude: 131, longitude: 75, accuracy: 10 })
            assert.equal(res.body.code, 'GPS_INVALID')
            res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...pointNorth(10), accuracy: 0 })
            assert.equal(res.body.code, 'GPS_INVALID')
        })

        it('rejects inaccurate GPS readings', async () => {
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...pointNorth(10), accuracy: 400 })
            assert.equal(res.status, 400)
            assert.equal(res.body.code, 'GPS_LOW_ACCURACY')
        })

        it('flags (but records) suspiciously perfect accuracy typical of mock-location apps', async () => {
            const { token } = await createUser()
            const { complete } = await performAction({ token, office, hrId: hr.user._id, fix: { ...pointNorth(10), accuracy: 1 } })
            assert.equal(complete.status, 201)
            const record = await Attendance.findById(complete.body.data._id).lean()
            assert.equal(record.checkInVerification.status, 'flagged')
            assert.ok(record.checkInVerification.flags.includes('SUSPECT_MOCK_LOCATION'))
        })

        it('ignores a manipulated device clock for timing but flags it', async () => {
            const { token } = await createUser()
            const fix = insideFix({ capturedAt: Date.now() - 3 * 24 * 36e5 })
            const { complete } = await performAction({ token, office, hrId: hr.user._id, fix })
            assert.equal(complete.status, 201)
            const record = await Attendance.findById(complete.body.data._id).lean()
            assert.ok(Date.now() - record.checkIn.getTime() < 60 * 1000)
            assert.ok(record.checkInVerification.flags.includes('DEVICE_CLOCK_SKEW'))
        })

        it('refuses attendance when no office is configured', async () => {
            await models.Office.deleteMany({})
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.status, 409)
            assert.equal(res.body.code, 'NO_OFFICE_CONFIGURED')
        })

        it('ignores inactive offices', async () => {
            await models.Office.updateOne({ _id: office._id }, { isActive: false })
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.body.code, 'NO_OFFICE_CONFIGURED')
        })
    })

    // -----------------------------------------------------------------------
    describe('dynamic QR', () => {
        const locate = async (token) => (await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })).body.data.verificationId

        it('rejects an expired QR code', async () => {
            const { user, token } = await createUser()
            const verificationId = await locate(token)
            const qrCode = await issueQr(office, hr.user._id)
            await OfficeQrToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })

            const res = await api(token).post('/api/attendance/check-in', { verificationId, qrCode })
            assert.equal(res.status, 403)
            assert.equal(res.body.code, 'QR_EXPIRED')
            assert.equal(await Attendance.countDocuments(), 0)
            assert.ok((await auditActions(user._id)).includes('QR_VALIDATION_FAILED'))
        })

        it('lets the employee rescan the current code after a bad scan, without redoing GPS', async () => {
            const { user, token } = await createUser()
            const verificationId = await locate(token)
            const stale = await issueQr(office, hr.user._id)
            await OfficeQrToken.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
            assert.equal((await api(token).post('/api/attendance/check-in', { verificationId, qrCode: stale })).body.code, 'QR_EXPIRED')

            const res = await api(token).post('/api/attendance/check-in', { verificationId, qrCode: await issueQr(office, hr.user._id) })
            assert.equal(res.status, 201)
            assert.equal(await Attendance.countDocuments({ user: user._id }), 1)
        })

        it('rejects a QR code that was already used by someone else', async () => {
            const first = await createUser()
            const second = await createUser()
            const qrCode = await issueQr(office, hr.user._id)

            const a = await performAction({ token: first.token, office, qrCode })
            assert.equal(a.complete.status, 201)
            const b = await performAction({ token: second.token, office, qrCode })
            assert.equal(b.complete.status, 403)
            assert.equal(b.complete.body.code, 'QR_USED')
            assert.equal(await Attendance.countDocuments({ user: second.user._id }), 0)
        })

        it('rejects a QR code from a different office', async () => {
            const other = await createOffice({ location: pointNorth(9000) })
            const { token } = await createUser()
            const { complete } = await performAction({ token, office, qrCode: await issueQr(other, hr.user._id) })
            assert.equal(complete.body.code, 'QR_WRONG_OFFICE')
        })

        it('rejects static, forged and malformed QR codes', async () => {
            const { token } = await createUser()
            const forged = JSON.stringify({ type: 'peopleflow-attendance', v: 1, officeId: String(office._id), token: crypto.randomBytes(32).toString('base64url'), expiresAt: '2099-01-01T00:00:00Z' })
            for (const qrCode of ['OFFICE_001', 'https://example.com', forged, '{"type":"peopleflow-attendance","token":"short"}']) {
                const verificationId = await locate(token)
                const res = await api(token).post('/api/attendance/check-in', { verificationId, qrCode })
                assert.equal(res.body.code, 'QR_INVALID', qrCode)
            }
            const verificationId = await locate(token)
            const missing = await api(token).post('/api/attendance/check-in', { verificationId })
            assert.equal(missing.body.code, 'QR_MISSING')
        })

        it('issues kiosk QR codes only to admin/HR and never returns the raw token', async () => {
            const employee = await createUser()
            assert.equal((await api(employee.token).post(`/api/offices/${office._id}/qr`)).status, 403)

            const res = await api(hr.token).post(`/api/offices/${office._id}/qr`)
            assert.equal(res.status, 201)
            assert.match(res.body.data.image, /^data:image\/svg\+xml;base64,/)
            assert.equal(res.body.data.payload, undefined)
            assert.equal(res.body.data.token, undefined)
            const stored = await OfficeQrToken.findOne().lean()
            assert.equal(stored.tokenHash.length, 64, 'only the SHA-256 hash is stored')
        })
    })

    // -----------------------------------------------------------------------
    describe('sessions, duplicates and replay', () => {
        it('blocks a second check-in on the same day', async () => {
            const { token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.status, 409)
            assert.equal(res.body.code, 'ALREADY_CHECKED_IN')
        })

        it('blocks check-in after the day is already completed', async () => {
            const { token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            await performAction({ token, action: 'check-out', office, hrId: hr.user._id })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.body.code, 'ALREADY_CHECKED_IN')
        })

        it('blocks a new check-in while yesterday\'s session is still open', async () => {
            const { user, token } = await createUser()
            const yesterday = new Date(Date.now() - 20 * 36e5)
            await Attendance.create({ user: user._id, date: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1), checkIn: new Date(Date.now() - 10 * 36e5) })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.body.code, 'ACTIVE_SESSION_EXISTS')
        })

        it('refuses check-out without an active check-in', async () => {
            const { token } = await createUser()
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-out', ...insideFix() })
            assert.equal(res.status, 409)
            assert.equal(res.body.code, 'NO_ACTIVE_CHECK_IN')
        })

        it('refuses a second check-out', async () => {
            const { token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            await performAction({ token, action: 'check-out', office, hrId: hr.user._id })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-out', ...insideFix() })
            assert.equal(res.body.code, 'ALREADY_CHECKED_OUT')
        })

        it('refuses check-out from outside the office', async () => {
            const { token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-out', ...pointNorth(3000), accuracy: 10 })
            assert.equal(res.body.code, 'GEOFENCE_OUTSIDE')
        })

        it('treats a repeated request (double click / lost response) idempotently', async () => {
            const { user, token } = await createUser()
            const { location, complete, qrCode } = await performAction({ token, office, hrId: hr.user._id })
            const again = await api(token).post('/api/attendance/check-in', { verificationId: location.body.data.verificationId, qrCode })
            assert.equal(again.status, 200)
            assert.equal(again.body.meta.replayed, true)
            assert.equal(again.body.data._id, complete.body.data._id)
            assert.equal(await Attendance.countDocuments({ user: user._id }), 1)
        })

        it('creates exactly one record under concurrent duplicate requests', async () => {
            const { user, token } = await createUser()
            const location = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            const qrCode = await issueQr(office, hr.user._id)
            const body = { verificationId: location.body.data.verificationId, qrCode }
            const results = await Promise.all(Array.from({ length: 5 }, () => api(token).post('/api/attendance/check-in', body)))

            assert.equal(await Attendance.countDocuments({ user: user._id }), 1)
            assert.equal(results.filter((r) => r.status === 201).length, 1)
            results.filter((r) => r.status !== 201).forEach((r) => {
                assert.ok(r.status === 200 || r.body.code === 'DUPLICATE_REQUEST', `unexpected ${r.status} ${r.body.code}`)
            })
        })

        it('creates one record even when two verifications race with two QR codes', async () => {
            const { user, token } = await createUser()
            const client = api(token)
            const [l1, l2] = await Promise.all([1, 2].map(() => client.post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })))
            const [q1, q2] = await Promise.all([issueQr(office, hr.user._id), issueQr(office, hr.user._id)])
            await Promise.all([
                client.post('/api/attendance/check-in', { verificationId: l1.body.data.verificationId, qrCode: q1 }),
                client.post('/api/attendance/check-in', { verificationId: l2.body.data.verificationId, qrCode: q2 })
            ])
            assert.equal(await Attendance.countDocuments({ user: user._id }), 1)
        })

        it('rejects an expired location verification', async () => {
            const { token } = await createUser()
            const location = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            await AttendanceVerification.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
            const res = await api(token).post('/api/attendance/check-in', { verificationId: location.body.data.verificationId, qrCode: await issueQr(office, hr.user._id) })
            assert.equal(res.body.code, 'VERIFICATION_EXPIRED')
        })

        it('does not let a check-in verification be used for check-out', async () => {
            const { token } = await createUser()
            const location = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            const res = await api(token).post('/api/attendance/check-out', { verificationId: location.body.data.verificationId, qrCode: await issueQr(office, hr.user._id) })
            assert.equal(res.body.code, 'VERIFICATION_INVALID')
        })
    })

    // -----------------------------------------------------------------------
    describe('identity and authorization', () => {
        it('requires authentication', async () => {
            const res = await api().post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.status, 401)
        })

        it('rejects a forged token', async () => {
            const res = await api('not.a.jwt').post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.status, 401)
        })

        it('rejects deactivated accounts and inactive employee profiles', async () => {
            const disabled = await createUser('employee', { isActive: false })
            assert.equal((await api(disabled.token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })).status, 403)

            const { user, token } = await createUser()
            await Employee.collection.insertOne({ user: user._id, employeeId: 'EMP999', firstName: 'A', lastName: 'B', status: 'inactive', salary: { basic: 1 }, joiningDate: new Date() })
            const res = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.body.code, 'EMPLOYEE_INACTIVE')
        })

        it('ignores client-supplied employee ids, timestamps and status', async () => {
            const me = await createUser()
            const victim = await createUser()
            const location = await api(me.token).post('/api/attendance/verify-location', {
                action: 'check-in', ...insideFix(), userId: String(victim.user._id), employeeId: String(victim.user._id)
            })
            const res = await api(me.token).post('/api/attendance/check-in', {
                verificationId: location.body.data.verificationId,
                qrCode: await issueQr(office, hr.user._id),
                user: String(victim.user._id),
                checkIn: '2020-01-01T09:00:00Z',
                status: 'present',
                date: '2020-01-01'
            })
            assert.equal(res.status, 201)
            const record = await Attendance.findById(res.body.data._id).lean()
            assert.equal(String(record.user), String(me.user._id))
            assert.ok(record.checkIn.getFullYear() >= 2026)
            assert.equal(await Attendance.countDocuments({ user: victim.user._id }), 0)
        })

        it('prevents completing another employee\'s verification', async () => {
            const owner = await createUser()
            const attacker = await createUser()
            const location = await api(owner.token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            const res = await api(attacker.token).post('/api/attendance/check-in', { verificationId: location.body.data.verificationId, qrCode: await issueQr(office, hr.user._id) })
            assert.equal(res.body.code, 'VERIFICATION_INVALID')
            assert.equal(await Attendance.countDocuments(), 0)
        })

        it('does not let admins record self-service attendance', async () => {
            const admin = await createUser('admin')
            const res = await api(admin.token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            assert.equal(res.status, 403)
        })

        it('hides coordinates, devices and fraud flags from employees', async () => {
            const { token } = await createUser()
            const { complete } = await performAction({ token, office, hrId: hr.user._id, deviceId: 'device-abcdef12', fix: { ...pointNorth(10), accuracy: 1 } })
            assert.equal(complete.body.data.checkInLocation, undefined)
            assert.deepEqual(complete.body.data.checkInVerification, { method: 'geofence+qr' })
        })

        it('flags one device used by two employees on the same day', async () => {
            const a = await createUser()
            const b = await createUser()
            await performAction({ token: a.token, office, hrId: hr.user._id, deviceId: 'shared-phone-001' })
            const { complete } = await performAction({ token: b.token, office, hrId: hr.user._id, deviceId: 'shared-phone-001' })
            const record = await Attendance.findById(complete.body.data._id).lean()
            assert.ok(record.checkInVerification.flags.includes('SHARED_DEVICE'))
        })

        it('rate-limits attendance attempts per user', async () => {
            const { token } = await createUser()
            let last
            for (let i = 0; i < 21; i += 1) {
                last = await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...pointNorth(5000), accuracy: 10 })
            }
            assert.equal(last.status, 429)
            assert.equal(last.body.code, 'RATE_LIMITED')
        })
    })

    // -----------------------------------------------------------------------
    describe('admin: offices, audit and corrections', () => {
        it('validates office configuration', async () => {
            const bad = await api(hr.token).post('/api/offices', { name: 'X Office', code: 'X1', location: { latitude: 200, longitude: 0 } })
            assert.equal(bad.status, 400)
            const badTz = await api(hr.token).post('/api/offices', { name: 'Y Office', code: 'Y1', location: { latitude: 1, longitude: 1 }, timezone: 'Mars/Base' })
            assert.equal(badTz.status, 400)
            const ok = await api(hr.token).post('/api/offices', { name: 'Branch', code: 'br-1', location: { latitude: 30.9, longitude: 75.85 }, radiusMeters: 150, correctionRoles: ['hr', 'manager'] })
            assert.equal(ok.status, 201)
            assert.equal(ok.body.data.code, 'BR-1')
            assert.ok(ok.body.data.correctionRoles.includes('admin'))
            const dupe = await api(hr.token).post('/api/offices', { name: 'Branch 2', code: 'BR-1', location: { latitude: 30.9, longitude: 75.85 } })
            assert.equal(dupe.status, 409)
            const employee = await createUser()
            assert.equal((await api(employee.token).get('/api/offices')).status, 403)
            const manager = await createUser('manager')
            assert.equal((await api(manager.token).get('/api/offices')).status, 200)
            assert.equal((await api(manager.token).patch(`/api/offices/${office._id}`, { radiusMeters: 5000 })).status, 403)
        })

        it('audits office changes with before/after values', async () => {
            const res = await api(hr.token).patch(`/api/offices/${office._id}`, { radiusMeters: 250 })
            assert.equal(res.status, 200)
            const entry = await AttendanceAuditLog.findOne({ action: 'OFFICE_UPDATED' }).lean()
            assert.equal(entry.metadata.before.radiusMeters, 100)
            assert.equal(entry.metadata.after.radiusMeters, 250)
            assert.equal(String(entry.performedBy), String(hr.user._id))
        })

        it('lists failed verification attempts for admin/HR only', async () => {
            const { token } = await createUser()
            await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...pointNorth(3000), accuracy: 10 })
            const res = await api(hr.token).get('/api/attendance/audit?failed=true')
            assert.equal(res.status, 200)
            assert.equal(res.body.data.length, 1)
            assert.equal(res.body.data[0].reason, 'GEOFENCE_OUTSIDE')
            const manager = await createUser('manager')
            assert.equal((await api(manager.token).get('/api/attendance/audit')).status, 403)
        })

        it('keeps the audit log immutable', async () => {
            const { token } = await createUser()
            await api(token).post('/api/attendance/verify-location', { action: 'check-in', ...insideFix() })
            await assert.rejects(AttendanceAuditLog.updateMany({}, { $set: { action: 'CHECK_IN_SUCCESS' } }), /immutable/)
            await assert.rejects(AttendanceAuditLog.deleteMany({}), /immutable/)
            const entry = await AttendanceAuditLog.findOne()
            entry.reason = 'tampered'
            await assert.rejects(entry.save(), /immutable/)
        })

        it('lets HR correct a missed check-out, with a reason and an audit trail', async () => {
            const { user, token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            const record = await Attendance.findOne({ user: user._id })
            const checkOut = new Date(Math.min(Date.now(), record.checkIn.getTime() + 60 * 1000))

            const noReason = await api(hr.token).patch(`/api/attendance/${record._id}/correct`, { checkOut })
            assert.equal(noReason.status, 400)

            const res = await api(hr.token).patch(`/api/attendance/${record._id}/correct`, { checkOut, reason: 'Forgot to check out, confirmed by manager' })
            assert.equal(res.status, 200)
            const updated = await Attendance.findById(record._id).lean()
            assert.equal(updated.checkOutVerification.status, 'manual')
            assert.equal(updated.corrections.length, 1)
            assert.equal(String(updated.corrections[0].by), String(hr.user._id))
            const entry = await AttendanceAuditLog.findOne({ action: 'MANUAL_CORRECTION' }).lean()
            assert.equal(String(entry.performedBy), String(hr.user._id))
            assert.equal(String(entry.user), String(user._id))
        })

        it('does not let anyone correct their own attendance', async () => {
            const office2 = await createOffice({ location: pointNorth(7000) })
            await performAction({ token: hr.token, office: office2, fix: { ...pointNorth(7010), accuracy: 10 }, hrId: hr.user._id })
            const own = await Attendance.findOne({ user: hr.user._id })
            const res = await api(hr.token).patch(`/api/attendance/${own._id}/correct`, { status: 'present', reason: 'Trying to fix my own record' })
            assert.equal(res.status, 403)
        })

        it('only lets managers correct when the office allows it', async () => {
            const manager = await createUser('manager')
            const { user, token } = await createUser()
            await performAction({ token, office, hrId: hr.user._id })
            const record = await Attendance.findOne({ user: user._id })
            const body = { status: 'present', reason: 'Late due to client visit' }

            assert.equal((await api(manager.token).patch(`/api/attendance/${record._id}/correct`, body)).status, 403)
            await models.Office.updateOne({ _id: office._id }, { correctionRoles: ['admin', 'hr', 'manager'] })
            assert.equal((await api(manager.token).patch(`/api/attendance/${record._id}/correct`, body)).status, 200)
            assert.equal((await api(token).patch(`/api/attendance/${record._id}/correct`, body)).status, 403)
        })

        it('creates a manual record for a missed day and refuses duplicates', async () => {
            const { user } = await createUser()
            const checkIn = new Date(Date.now() - 3 * 24 * 36e5)
            const checkOut = new Date(checkIn.getTime() + 8 * 36e5)
            const body = { userId: String(user._id), officeId: String(office._id), checkIn, checkOut, reason: 'Phone was broken, verified by HR' }
            const res = await api(hr.token).post('/api/attendance/manual', body)
            assert.equal(res.status, 201)
            assert.equal(res.body.data.checkInVerification.status, 'manual')
            assert.equal((await api(hr.token).post('/api/attendance/manual', body)).status, 409)
            const future = await api(hr.token).post('/api/attendance/manual', { ...body, checkIn: new Date(Date.now() + 36e5) })
            assert.equal(future.status, 400)
        })
    })
})
