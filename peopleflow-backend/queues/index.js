/**
 * Background jobs. With REDIS_URL, jobs run through BullMQ (retries, persistence,
 * repeatable weekly report). Without it, jobs run in-process right after the
 * response is sent, so the app stays fully functional in local development.
 */
const { Queue, Worker } = require('bullmq')
const IORedis = require('ioredis')
const processors = require('./processors')

const QUEUE_NAME = 'peopleflow-jobs'
const WEEKLY_REPORT_CRON = '0 9 * * 1' // Mondays 09:00

let queue = null
let worker = null
let fallbackTimer = null

const runInline = (name, data) => {
    setImmediate(async () => {
        try {
            await processors[name](data)
        } catch (error) {
            console.error(`Job "${name}" failed:`, error.message)
        }
    })
}

/** Next Monday 09:00 (server time) — used when BullMQ is unavailable. */
const msUntilNextWeeklyReport = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(9, 0, 0, 0)
    next.setDate(now.getDate() + ((8 - now.getDay()) % 7))
    if (next <= now) next.setDate(next.getDate() + 7)
    return next - now
}

const scheduleFallbackWeeklyReport = () => {
    fallbackTimer = setTimeout(() => {
        runInline('weekly-report', {})
        scheduleFallbackWeeklyReport()
    }, msUntilNextWeeklyReport())
    fallbackTimer.unref()
}

const initQueues = async () => {
    if (!process.env.REDIS_URL) {
        console.log('Queue: REDIS_URL not set, running jobs in-process')
        scheduleFallbackWeeklyReport()
        return
    }

    const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    queue = new Queue(QUEUE_NAME, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 500
        }
    })

    worker = new Worker(QUEUE_NAME, async (job) => {
        const processor = processors[job.name]
        if (!processor) throw new Error(`No processor for job "${job.name}"`)
        return processor(job.data)
    }, { connection, concurrency: 5 })

    worker.on('failed', (job, error) => console.error(`Job "${job?.name}" failed:`, error.message))

    await queue.upsertJobScheduler('weekly-report', { pattern: WEEKLY_REPORT_CRON }, { name: 'weekly-report', data: {} })
    console.log('Queue: BullMQ connected')
}

const addJob = async (name, data = {}) => {
    if (!processors[name]) throw new Error(`Unknown job "${name}"`)
    if (queue) return queue.add(name, data)
    runInline(name, data)
    return null
}

const closeQueues = async () => {
    if (fallbackTimer) clearTimeout(fallbackTimer)
    await Promise.all([worker?.close(), queue?.close()])
}

module.exports = { initQueues, addJob, closeQueues }
