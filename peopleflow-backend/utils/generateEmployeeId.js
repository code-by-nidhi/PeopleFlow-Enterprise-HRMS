const Counter = require('../models/counter')
const Employee = require('../models/employee')

/**
 * Atomic, race-free sequence (EMP001, EMP002 …). Sorting existing IDs as strings
 * breaks after EMP999 and two simultaneous requests could get the same number.
 */
const generateEmployeeId = async () => {
    const exists = await Counter.exists({ _id: 'employeeId' })
    if (!exists) {
        const count = await Employee.countDocuments()
        await Counter.updateOne({ _id: 'employeeId' }, { $setOnInsert: { seq: count } }, { upsert: true })
    }

    const counter = await Counter.findOneAndUpdate(
        { _id: 'employeeId' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    )
    return `EMP${String(counter.seq).padStart(3, '0')}`
}

module.exports = generateEmployeeId
