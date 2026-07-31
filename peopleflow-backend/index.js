const express=require('express')
const dotenv=require('dotenv').config()
const connectDB=require('./config/db')
const app=express()
connectDB()
app.listen(process.env.PORT,()=>{
    console.log(`Server is running successfully on port ${process.env.PORT}`)
})