const PDFDocument = require('pdfkit')
const Employee = require('../models/employee')
const User = require('../models/user')
const Attendance = require('../models/attendance')
const Leave = require('../models/leave')
const Task = require('../models/task')
const sendEmail = require('../utils/sendEmail')
const { uploadFile } = require('../services/storage')
const { notifyUsers } = require('../services/notification')
const { ROLES } = require('../config/constants')
const { addDays, startOfDay } = require('../utils/dates')

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const formatMoney = (value) => `INR ${Number(value || 0).toLocaleString('en-IN')}`

const processEmail = async (data) => sendEmail(data)

const buildSalarySlipPdf = (employee, month, year) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        const chunks = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const { basic = 0, hra = 0, allowances = 0, deductions = 0 } = employee.salary || {}
        const gross = basic + hra + allowances

        doc.fontSize(20).text('PeopleFlow HRMS', { align: 'left' })
        doc.fontSize(12).fillColor('#64748b').text(`Salary Slip — ${MONTHS[month - 1]} ${year}`)
        doc.moveDown(1.5).fillColor('#0f172a')

        const rows = [
            ['Employee ID', employee.employeeId],
            ['Name', `${employee.firstName} ${employee.lastName}`],
            ['Department', employee.department?.name || '—'],
            ['Designation', employee.designation?.title || '—'],
            ['Joining Date', employee.joiningDate ? new Date(employee.joiningDate).toDateString() : '—']
        ]
        rows.forEach(([label, value]) => doc.fontSize(11).text(`${label}: ${value}`))

        doc.moveDown(1.5).fontSize(14).text('Earnings')
        doc.fontSize(11)
            .text(`Basic: ${formatMoney(basic)}`)
            .text(`House Rent Allowance: ${formatMoney(hra)}`)
            .text(`Other Allowances: ${formatMoney(allowances)}`)
            .text(`Gross Earnings: ${formatMoney(gross)}`)

        doc.moveDown().fontSize(14).text('Deductions')
        doc.fontSize(11).text(`Total Deductions: ${formatMoney(deductions)}`)

        doc.moveDown().fontSize(14).text(`Net Pay: ${formatMoney(gross - deductions)}`)
        doc.moveDown(2).fontSize(9).fillColor('#94a3b8').text('This is a system generated document and does not require a signature.')
        doc.end()
    })

const processSalarySlip = async ({ employeeId, month, year }) => {
    const employee = await Employee.findById(employeeId).populate('department', 'name').populate('designation', 'title').populate('user', 'email')
    if (!employee) throw new Error(`Employee ${employeeId} not found`)

    const buffer = await buildSalarySlipPdf(employee, month, year)
    const period = `${year}-${String(month).padStart(2, '0')}`
    const filename = `salary-slip-${employee.employeeId}-${period}.pdf`
    const stored = await uploadFile({ buffer, originalname: filename, mimetype: 'application/pdf' }, 'salary-slips')

    employee.documents.push({ name: `Salary Slip ${MONTHS[month - 1]} ${year}`, type: 'salary-slip', ...stored })
    await employee.save()

    await notifyUsers([employee.user._id], {
        title: 'Salary slip available',
        message: `Your salary slip for ${MONTHS[month - 1]} ${year} has been generated.`,
        type: 'payroll',
        link: '/profile'
    })

    await sendEmail({
        to: employee.user.email,
        subject: `Salary slip — ${MONTHS[month - 1]} ${year}`,
        text: `Hello ${employee.firstName},\n\nYour salary slip for ${MONTHS[month - 1]} ${year} is attached.\n\nRegards,\nPeopleFlow HRMS`,
        attachments: [{ filename, content: buffer }]
    })
}

const processWeeklyReport = async () => {
    const to = startOfDay(new Date())
    const from = addDays(to, -7)
    const range = { $gte: from, $lt: to }

    const [newHires, attendanceRecords, leavesApproved, leavesPending, tasksCompleted, tasksOverdue, recipients] = await Promise.all([
        Employee.countDocuments({ joiningDate: range }),
        Attendance.countDocuments({ date: range }),
        Leave.countDocuments({ status: 'approved', reviewedAt: range }),
        Leave.countDocuments({ status: 'pending' }),
        Task.countDocuments({ status: 'completed', completedAt: range }),
        Task.countDocuments({ status: { $ne: 'completed' }, deadline: { $lt: to } }),
        User.find({ role: { $in: [ROLES.ADMIN, ROLES.HR] }, isActive: true }).select('email name').lean()
    ])

    const summary = [
        `New hires: ${newHires}`,
        `Attendance check-ins: ${attendanceRecords}`,
        `Leaves approved: ${leavesApproved}`,
        `Leaves pending review: ${leavesPending}`,
        `Tasks completed: ${tasksCompleted}`,
        `Tasks overdue: ${tasksOverdue}`
    ].join('\n')

    const period = `${from.toDateString()} – ${addDays(to, -1).toDateString()}`

    await Promise.all(recipients.map((user) => sendEmail({
        to: user.email,
        subject: `Weekly HR report (${period})`,
        text: `Hello ${user.name},\n\nHere is the PeopleFlow summary for ${period}:\n\n${summary}\n\nRegards,\nPeopleFlow HRMS`
    })))

    await notifyUsers(recipients.map((u) => u._id), {
        title: 'Weekly report ready',
        message: `${newHires} new hires, ${tasksCompleted} tasks completed, ${leavesPending} leaves pending.`,
        type: 'system',
        link: '/dashboard'
    })
}

module.exports = {
    email: processEmail,
    'salary-slip': processSalarySlip,
    'weekly-report': processWeeklyReport
}
