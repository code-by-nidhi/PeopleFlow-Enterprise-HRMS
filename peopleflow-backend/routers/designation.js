const express=require('express')
const { addDesignation, fetchDesignation } = require('../controllers/designation')
const router=express.Router()
router.post('/add-designation',addDesignation)
router.get('/fetch-designation',fetchDesignation)

module.exports=router