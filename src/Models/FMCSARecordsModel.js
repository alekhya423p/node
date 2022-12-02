const mongoose = require("mongoose")

const FMCSARecordsSchema = new mongoose.Schema({
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
    },
    requestType:{
        type:String,
        enum:['WEB_TRANSFER_DATA','MOBILE_TRANSFER_DATA','MOBILE_EMAIL_TRANSFER'],
        default:'MOBILE_EMAIL_TRANSFER'
    },
    comment:{
        type:String,
        default:''
    },
    fileName:{
        type:String,
        default:''
    },
    file:{
        type:String,
        default:''
    },
    test:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        default:'sent'
    },
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

const FMCSARecord = mongoose.model('FMCSARecord',FMCSARecordsSchema)
module.exports = FMCSARecord