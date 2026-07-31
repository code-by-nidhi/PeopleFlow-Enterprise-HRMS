const designation = require('../models/designation');
const Designation = require('../models/designation')
const addDesignation = async (req, res) => {
    try {
        const { title } = req.body
        if (!title) {
            return res.status(400).json({
                success: false,
                msg: "Designation title is required"
            })
        }
        const designationRegex = /^[A-Za-z& ]{2,50}$/;
        if (!designationRegex.test(name)) {
            return res.status(400).json({
                success: false,
                msg: "Invalid Designation title"
            })
        }

        const designationExists = await Designation.findOne({
            title: title.trim()
        })
        if (designationExists) {
            return res.status(400).json({
                sucess: false,
                msg: "Designation already exists"
            })
        }

        const designation = await Designation.create({ title })
        if (designation) {
            return res.status(200).json({
                success: true,
                msg: "Designation created successfully"
            })
        }


    } catch (error) {
        return res.status(500).json({
            msg: error
        })
    }
}

const fetchDesignation=async(req,res)=>{
    try {
        const designations=await Designation.find({})
        if(designations){
            return res.status(200).json({
                msg:"Designations fetched successfully",
                designation:designations
            })
        }
    } catch (error) {
        return res.status(500).json({
            msg:error
        })
    }
}

module.exports = { addDesignation ,fetchDesignation}