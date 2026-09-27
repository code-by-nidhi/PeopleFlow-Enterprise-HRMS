const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./docs/swagger')
const { notFound, errorHandler } = require('./middleware/errorHandler')

// The local dev server and the deployed frontend are always allowed; CLIENT_URL adds more
const DEFAULT_CLIENT_URLS = [
    'http://localhost:5173',
    'https://peopleflow-enterprise-hrms-frontend.onrender.com'
]
const corsOrigins = [...new Set([
    ...DEFAULT_CLIENT_URLS,
    ...(process.env.CLIENT_URL || '').split(',')
])]
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)

const app = express()

// Behind Render/Railway proxies so rate limiting sees the real client IP
app.set('trust proxy', 1)

app.use(helmet({
    // Uploaded files are loaded by the frontend from a different origin
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }))

app.get('/', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'PeopleFlow backend is running'
    })
})
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'PeopleFlow API Docs' }))

app.use('/api/auth', require('./routers/auth'))
app.use('/api/users', require('./routers/user'))
app.use('/api/employees', require('./routers/employee'))
app.use('/api/departments', require('./routers/department'))
app.use('/api/designations', require('./routers/designation'))
app.use('/api/attendance', require('./routers/attendance'))
app.use('/api/offices', require('./routers/office'))
app.use('/api/leaves', require('./routers/leave'))
app.use('/api/tasks', require('./routers/task'))
app.use('/api/dashboard', require('./routers/dashboard'))
app.use('/api/upload', require('./routers/upload'))
app.use('/api/notifications', require('./routers/notification'))

app.use(notFound)
app.use(errorHandler)

module.exports = { app, corsOrigins }
