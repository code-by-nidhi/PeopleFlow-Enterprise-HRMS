const express=require('express')
const { addDepartment, fetchDepartments } = require('../controllers/department')
const router=express.Router()
router.post('/add-department',addDepartment)
router.get('/fetch-department',fetchDepartments)

module.exports=router