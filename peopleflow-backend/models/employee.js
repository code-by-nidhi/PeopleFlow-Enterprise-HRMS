const mongoose=require('mongoose')
const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    employeeId: {
        type: String,
        unique: true
    },

    firstName: String,
    lastName: String,

    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },

    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation"
    },

    salary: Number,
    joiningDate: Date
}, { timestamps: true });

module.exports=mongoose.model('Employee',employeeSchema)