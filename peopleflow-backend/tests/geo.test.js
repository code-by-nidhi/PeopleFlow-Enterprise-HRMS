const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { haversineDistance, evaluateGeofence } = require('../utils/geo')
const { attendanceDay, isAfterLocalTime } = require('../utils/dates')
const { parseQrPayload } = require('../services/officeQr')

const office = { location: { latitude: 31.326, longitude: 75.5762 }, radiusMeters: 100 }
const north = (meters) => ({ latitude: 31.326 + meters / 111195, longitude: 75.5762 })

describe('geofence maths', () => {
    it('computes Haversine distances', () => {
        assert.equal(Math.round(haversineDistance(office.location, office.location)), 0)
        assert.ok(Math.abs(haversineDistance(office.location, north(500)) - 500) < 1)
        // Jalandhar → Ludhiana is roughly 56 km
        const km = haversineDistance({ latitude: 31.326, longitude: 75.5762 }, { latitude: 30.901, longitude: 75.8573 }) / 1000
        assert.ok(km > 50 && km < 60)
    })

    it('classifies inside, boundary and outside', () => {
        assert.equal(evaluateGeofence(office, { ...north(99), accuracy: 5 }).status, 'inside')
        assert.equal(evaluateGeofence(office, { ...north(99.9), accuracy: 5 }).status, 'inside')
        // A hair outside the radius is never "inside", only within GPS error
        assert.equal(evaluateGeofence(office, { ...north(100.5), accuracy: 5 }).status, 'boundary')
        assert.equal(evaluateGeofence(office, { ...north(115), accuracy: 30 }).status, 'boundary')
        assert.equal(evaluateGeofence(office, { ...north(115), accuracy: 5 }).status, 'outside')
        assert.equal(evaluateGeofence(office, { ...north(5000), accuracy: 50 }).status, 'outside')
    })
})

describe('time zones', () => {
    it('uses the office calendar day, independent of the device clock', () => {
        // 20:00 UTC is already the next day in India
        const day = attendanceDay(new Date('2026-09-21T20:00:00Z'), 'Asia/Kolkata')
        assert.equal(day.getDate(), 22)
        const ny = attendanceDay(new Date('2026-09-21T20:00:00Z'), 'America/New_York')
        assert.equal(ny.getDate(), 21)
    })

    it('decides lateness in the office time zone', () => {
        assert.equal(isAfterLocalTime(new Date('2026-09-21T03:55:00Z'), '09:30', 'Asia/Kolkata'), false) // 09:25 IST
        assert.equal(isAfterLocalTime(new Date('2026-09-21T04:05:00Z'), '09:30', 'Asia/Kolkata'), true) // 09:35 IST
    })
})

describe('QR payload parsing', () => {
    const token = 'a'.repeat(43)
    it('accepts only well-formed PeopleFlow payloads', () => {
        assert.deepEqual(parseQrPayload(JSON.stringify({ type: 'peopleflow-attendance', officeId: 'x', token })), { token, officeId: 'x' })
        assert.equal(parseQrPayload('OFFICE_001'), null)
        assert.equal(parseQrPayload(JSON.stringify({ type: 'other', token })), null)
        assert.equal(parseQrPayload(JSON.stringify({ type: 'peopleflow-attendance', token: 'short' })), null)
        assert.equal(parseQrPayload('x'.repeat(600)), null)
        assert.equal(parseQrPayload({ token }), null)
    })
})
