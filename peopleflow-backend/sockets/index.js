const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io = null

const userRoom = (userId) => `user:${userId}`
const roleRoom = (role) => `role:${role}`
const kioskRoom = (officeId) => `kiosk:${officeId}`

// Only admins and HR run office QR kiosks
const KIOSK_ROLES = ['admin', 'hr']
const OBJECT_ID = /^[a-f\d]{24}$/i

const initSocket = (httpServer, corsOrigins) => {
    io = new Server(httpServer, {
        cors: { origin: corsOrigins, credentials: true }
    })

    // Only authenticated users may open a socket
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token
            if (!token) return next(new Error('Authentication required'))
            socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY)
            next()
        } catch {
            next(new Error('Invalid or expired token'))
        }
    })

    io.on('connection', (socket) => {
        const { userId, role } = socket.user
        socket.join(userRoom(userId))
        socket.join(roleRoom(role))

        // An office screen listens for "QR used" so it can show a new code immediately
        socket.on('kiosk:join', (officeId) => {
            if (KIOSK_ROLES.includes(role) && typeof officeId === 'string' && OBJECT_ID.test(officeId)) {
                socket.join(kioskRoom(officeId))
            }
        })
        socket.on('kiosk:leave', (officeId) => {
            if (typeof officeId === 'string') socket.leave(kioskRoom(officeId))
        })
    })

    console.log('Socket.io initialised')
    return io
}

const emitToUser = (userId, event, payload) => {
    if (io) io.to(userRoom(String(userId))).emit(event, payload)
}

const emitToRoles = (roles, event, payload) => {
    if (io) io.to(roles.map(roleRoom)).emit(event, payload)
}

const emitToKiosk = (officeId, event, payload) => {
    if (io) io.to(kioskRoom(String(officeId))).emit(event, payload)
}

module.exports = { initSocket, emitToUser, emitToRoles, emitToKiosk }
