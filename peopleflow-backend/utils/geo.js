const EARTH_RADIUS_METERS = 6371008.8

const toRadians = (degrees) => (degrees * Math.PI) / 180

/** Great-circle distance in metres between two { latitude, longitude } points (Haversine). */
const haversineDistance = (from, to) => {
    const dLat = toRadians(to.latitude - from.latitude)
    const dLon = toRadians(to.longitude - from.longitude)
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Decides whether a GPS fix is inside an office geofence.
 *   inside   – the reported point is within the radius
 *   boundary – outside the radius but within the reading's error margin; the
 *              employee might be inside, so they are asked to move further in
 *   outside  – beyond the radius even allowing for GPS error
 * The error margin never widens the fence: only `inside` is accepted.
 */
const evaluateGeofence = (office, { latitude, longitude, accuracy }) => {
    const distance = haversineDistance(office.location, { latitude, longitude })
    let status = 'outside'
    if (distance <= office.radiusMeters) status = 'inside'
    else if (distance - accuracy <= office.radiusMeters) status = 'boundary'
    return { status, distance: Math.round(distance) }
}

const roundCoordinate = (value, decimals) => Number(Number(value).toFixed(decimals))

module.exports = { haversineDistance, evaluateGeofence, roundCoordinate }
