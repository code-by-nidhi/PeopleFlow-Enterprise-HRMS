require('dotenv').config()

const http = require('http')
const mongoose = require('mongoose')
const connectDB = require('./config/db')
const seedAdmin = require('./seed')
const { app, corsOrigins } = require('./app')
const { initSocket } = require('./sockets')
const { connectCache } = require('./services/cache')
const { initQueues, closeQueues } = require('./queues')

const REQUIRED_ENV = ['MONGODB_URI', 'ACCESS_TOKEN_SECRET_KEY', 'REFRESH_TOKEN_SECRET_KEY']

const startServer = async () => {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key])
    if (missing.length) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`)
        process.exit(1)
    }

    await connectDB()
    await seedAdmin()
    connectCache()
    await initQueues()

    const server = http.createServer(app)
    initSocket(server, corsOrigins)

    const port = process.env.PORT || 5000
    server.listen(port, () => {
        console.log(`Server is running on port ${port}`)
        console.log(`API docs: http://localhost:${port}/api/docs`)
    })

    const shutdown = async (signal) => {
        console.log(`${signal} received, shutting down gracefully`)
        server.close()
        await closeQueues()
        await mongoose.connection.close()
        process.exit(0)
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
}

startServer()
