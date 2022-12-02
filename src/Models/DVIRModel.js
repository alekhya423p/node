const mongoose = require("mongoose")

const DVIRSchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company',
        required:[true,'Please add company id'],
    },
    driverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Driver',
        required:[true,'Please add driver id'],
    },
    vehicleId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Vehicle',
        required:[true,'Please add vehicle id'],
    },
    timestamp:{
        type:String,
        default:''
    },
    location:{
        type:String,
        default:''
    },
    odometer:{
        type:String,
        default:''
    },
    trailers:[],
    vehicleDefects:[],
    trailerDefects:[],
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    updatedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    createdAt:{
        type:Date,
        default: Date.now
    },
    updatedAt:{
        type:Date,
        default: Date.now
    },
    isActive:{
        type:Boolean,
        default:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
})

const DVIR = mongoose.model('DVIR',DVIRSchema)
module.exports = DVIR