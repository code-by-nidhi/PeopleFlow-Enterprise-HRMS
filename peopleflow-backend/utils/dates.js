const DAY_MS = 24 * 60 * 60 * 1000

/** Midnight (server local time) of the given date. */
const startOfDay = (date = new Date()) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS)

/** Inclusive count of Mon–Sat days between two dates (Sundays are off). */
const countWorkingDays = (start, end) => {
    let count = 0
    for (let d = startOfDay(start); d <= startOfDay(end); d = addDays(d, 1)) {
        if (d.getDay() !== 0) count++
    }
    return count
}

const isValidDate = (value) => value !== undefined && value !== null && value !== '' && !Number.isNaN(new Date(value).getTime())

const isValidTimeZone = (timeZone) => {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone })
        return true
    } catch {
        return false
    }
}

/** Calendar date and wall-clock time of `date` in an IANA time zone. */
const zonedParts = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date)
    const get = (type) => Number(parts.find((p) => p.type === type).value)
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/**
 * The attendance day for an instant as seen in an office's time zone, stored as
 * server-local midnight so it lines up with every other `date` in the system.
 */
const attendanceDay = (date, timeZone) => {
    const { year, month, day } = zonedParts(date, timeZone)
    return new Date(year, month - 1, day)
}

/** True when `date` is after the HH:MM threshold in the given time zone. */
const isAfterLocalTime = (date, hhmm, timeZone) => {
    const [hours, minutes] = hhmm.split(':').map(Number)
    const { hour, minute } = zonedParts(date, timeZone)
    return hour * 60 + minute > hours * 60 + minutes
}

module.exports = { DAY_MS, startOfDay, addDays, countWorkingDays, isValidDate, isValidTimeZone, zonedParts, attendanceDay, isAfterLocalTime }
