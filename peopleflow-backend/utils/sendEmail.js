const nodemailer = require('nodemailer')

let transporter = null

const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
    }
    return transporter
}

/**
 * Sends an email. Without SMTP credentials the message is logged instead, so
 * local development never blocks on mail delivery.
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
    if (!isEmailConfigured()) {
        console.log(`Email (not sent, SMTP not configured) → ${to}: ${subject}`)
        return null
    }

    const info = await getTransporter().sendMail({
        from: `"PeopleFlow HRMS" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments
    })
    console.log('Email sent: %s', info.messageId)
    return info
}

module.exports = sendEmail
module.exports.isEmailConfigured = isEmailConfigured
