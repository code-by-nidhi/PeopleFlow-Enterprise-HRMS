/**
 * Test harness: an in-memory MongoDB (never the real database), the Express app,
 * and factories for users, offices and kiosk QR codes.
 */
process.env.NODE_ENV = 'test'
process.env.ACCESS_TOKEN_SECRET_KEY = 'test-access-secret'
process.env.REFRESH_TOKEN_SECRET_KEY = 'test-refresh-secret'

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const request = require('supertest')
const { app } = require('../app')
const User = require('../models/user')
const Employee = require('../models/employee')
const Office = require('../models/office')
const Attendance = require('../models/attendance')
const AttendanceAuditLog = require('../models/attendanceAuditLog')
const AttendanceVerification = require('../models/attendanceVerification')
const OfficeQrToken = require('../models/officeQrToken')
const { generateAccessToken } = require('../utils/tokens')
const { issueQrToken } = require('../services/officeQr')

let mongod

const startDatabase = async () => {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
    // Unique indexes are part of what is being tested
    await Promise.all([User, Employee, Office, Attendance, AttendanceAuditLog, AttendanceVerification, OfficeQrToken].map((m) => m.syncIndexes()))
}

const stopDatabase = async () => {
    await mongoose.disconnect()
    if (mongod) await mongod.stop()
}

// Native driver deletes bypass the audit log's immutability hooks (test cleanup only)
const clearDatabase = async () => {
    const collections = await mongoose.connection.db.collections()
    await Promise.all(collections.map((c) => c.deleteMany({})))
}

const OFFICE_POINT = { latitude: 31.326, longitude: 75.5762 }
const METERS_PER_DEGREE_LAT = 111195

/** A point `meters` north of the office. */
const pointNorth = (meters, from = OFFICE_POINT) => ({
    latitude: from.latitude + meters / METERS_PER_DEGREE_LAT,
    longitude: from.longitude
})

let counter = 0
const createUser = async (role = 'employee', overrides = {}) => {
    counter += 1
    const user = await User.create({
        name: `${role} ${counter}`,
        email: `${role}${counter}@test.local`,
        password: 'hashed-not-used',
        role,
        mustChangePassword: false,
        ...overrides
    })
    return { user, token: generateAccessToken(user) }
}

const createOffice = (overrides = {}) => {
    counter += 1
    return Office.create({
        name: `Office ${counter}`,
        code: `OFF-${counter}`,
        location: OFFICE_POINT,
        radiusMeters: 100,
        timezone: 'Asia/Kolkata',
        ...overrides
    })
}

const issueQr = async (office, createdBy) => (await issueQrToken(office, createdBy)).payload

const api = (token, deviceId) => {
    const withAuth = (req) => {
        if (token) req.set('Authorization', `Bearer ${token}`)
        if (deviceId) req.set('X-Device-Id', deviceId)
        return req
    }
    return {
        post: (url, body) => withAuth(request(app).post(url)).send(body),
        patch: (url, body) => withAuth(request(app).patch(url)).send(body),
        get: (url) => withAuth(request(app).get(url))
    }
}

/** Good GPS reading inside the office. */
const insideFix = (extra = {}) => ({ ...pointNorth(20), accuracy: 15, capturedAt: Date.now(), ...extra })

/** Runs the full two-step flow and returns both responses. */
const performAction = async ({ token, action = 'check-in', office, hrId, fix = insideFix(), deviceId, qrCode }) => {
    const client = api(token, deviceId)
    const location = await client.post('/api/attendance/verify-location', { action, ...fix })
    if (location.status !== 201) return { location }
    const code = qrCode ?? await issueQr(office, hrId)
    const complete = await client.post(`/api/attendance/${action}`, { verificationId: location.body.data.verificationId, qrCode: code })
    return { location, complete, qrCode: code }
}

module.exports = {
    startDatabase,
    stopDatabase,
    clearDatabase,
    createUser,
    createOffice,
    issueQr,
    api,
    insideFix,
    pointNorth,
    performAction,
    OFFICE_POINT,
    models: { User, Employee, Office, Attendance, AttendanceAuditLog, AttendanceVerification, OfficeQrToken }
}
