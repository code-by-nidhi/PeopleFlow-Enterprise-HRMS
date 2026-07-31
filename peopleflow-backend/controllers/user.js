const express=require('express')
const { addDepartment } = require('./department')
const router=express.Router()
router.post('/addDepartment',addDepartment)

module.exports=router