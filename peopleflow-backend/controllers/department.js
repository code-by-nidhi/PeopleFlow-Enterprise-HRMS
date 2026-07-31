const Department=require('../models/department')
const addDepartment=async(req,res)=>{
    try {
        const {name}=req.body
        if(!name){
            return res.status(400).json({
                success:false,
                msg:"Department name is required"
            })
        }
        const departmentRegex = /^[A-Za-z& ]{2,50}$/;
        if(!departmentRegex.test(name)){
            return res.status(400).json({
                success:false,
                msg:"Invalid Department name"
            })
        }

        const departmentExists=await Department.findOne({
            name:name.trim()
        })
        if(departmentExists){
            return res.status(400).json({
                sucess:false,
                msg:"Department already exists"
            })
        }
        const department=await Department.create({name})
       if(department){
           return res.status(200).json({
               success:true,
               msg:"Department created successfully"
           })
       }
        
    } catch (error) {
        return res.status(500).json({
            msg:error
        })
    }
}
const fetchDepartments=async(req,res)=>{
    try {
        const departments=await Department.find()
        if(departments){
            return res.status(200).json({
                msg:"Fetched successfully",
                department:departments
            })
        }
    } catch (error) {
        return res.status(500).json({
            msg:error
        })
    }
}

module.exports={addDepartment,fetchDepartments}