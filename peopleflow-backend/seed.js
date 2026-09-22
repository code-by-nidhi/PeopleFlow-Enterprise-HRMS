const bcryptjs = require('bcryptjs')
const User = require('./models/user')
const { ROLES } = require('./config/constants')

/** Creates the first admin from ADMIN_* env vars if no admin exists yet. */
const seedAdmin = async () => {
    try {
        if (await User.exists({ role: ROLES.ADMIN })) {
            console.log('Admin user already exists')
            return
        }

        const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
            console.warn('No admin found and ADMIN_EMAIL / ADMIN_PASSWORD are not set — skipping admin seed')
            return
        }

        await User.create({
            name: ADMIN_USERNAME || 'Administrator',
            email: ADMIN_EMAIL,
            password: await bcryptjs.hash(ADMIN_PASSWORD, 10),
            role: ROLES.ADMIN,
            mustChangePassword: false
        })
        console.log('Admin user created successfully')
    } catch (err) {
        console.error('Admin seed failed:', err.message)
    }
}

module.exports = seedAdmin

// Allow `node seed.js` as described in the README
if (require.main === module) {
    require('dotenv').config()
    const mongoose = require('mongoose')
    const connectDB = require('./config/db')
    connectDB()
        .then(seedAdmin)
        .finally(() => mongoose.connection.close())
}
