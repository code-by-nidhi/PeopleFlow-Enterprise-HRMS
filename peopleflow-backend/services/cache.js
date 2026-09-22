/**
 * Cache layer: Redis when REDIS_URL is configured, otherwise an in-process
 * TTL map so the API still works (and still benefits from caching) locally.
 */
const Redis = require('ioredis')

let redis = null
const memory = new Map()

const connectCache = () => {
    if (!process.env.REDIS_URL) {
        console.log('Cache: REDIS_URL not set, using in-memory cache')
        return
    }
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false })
    redis.on('ready', () => console.log('Cache: connected to Redis'))
    redis.on('error', (err) => console.error('Cache: Redis error -', err.message))
}

const isRedisReady = () => redis && redis.status === 'ready'

const get = async (key) => {
    try {
        if (isRedisReady()) {
            const raw = await redis.get(key)
            return raw ? JSON.parse(raw) : null
        }
        const entry = memory.get(key)
        if (!entry) return null
        if (entry.expiresAt < Date.now()) {
            memory.delete(key)
            return null
        }
        return entry.value
    } catch {
        return null
    }
}

const set = async (key, value, ttlSeconds) => {
    try {
        if (isRedisReady()) {
            await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
            return
        }
        memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    } catch {
        // A cache write failure must never fail the request
    }
}

/** Invalidates every key that starts with one of the given prefixes. */
const invalidate = async (...prefixes) => {
    try {
        if (isRedisReady()) {
            for (const prefix of prefixes) {
                let cursor = '0'
                do {
                    const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
                    cursor = next
                    if (keys.length) await redis.del(...keys)
                } while (cursor !== '0')
            }
            return
        }
        for (const key of memory.keys()) {
            if (prefixes.some((prefix) => key.startsWith(prefix))) memory.delete(key)
        }
    } catch {
        // Stale entries expire on their own TTL
    }
}

/** Returns the cached value for `key`, computing and storing it on a miss. */
const remember = async (key, ttlSeconds, compute) => {
    const cached = await get(key)
    if (cached !== null) return cached
    const value = await compute()
    await set(key, value, ttlSeconds)
    return value
}

const CACHE_KEYS = {
    DASHBOARD: 'dashboard:',
    DEPARTMENTS: 'departments:',
    DESIGNATIONS: 'designations:',
    EMPLOYEES: 'employees:'
}

module.exports = { connectCache, get, set, invalidate, remember, CACHE_KEYS }
