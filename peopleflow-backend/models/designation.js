const mongoose=require("mongoose")

const designationSchema=new mongoose.Schema({
    title:{
    type:String,
    required:true
    }
})

module.exports=mongoose.model('Designation',designationSchema)