const mongoose = require("mongoose")

const IFTARecordsSchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company',
        required:[true,'Please add company id'],
    },
    fromDate:{
        type:Date
    },
    toDate:{
        type:Date
    },
    timeSubmitted:{
        type:Date
    },
    timeGenerated:{
        type:Date
    },
    pdfUrl:{
        type:String,
        default:''
    },
    csvUrl:{
        type:String,
        default:''
    },
    status:{
        type:String,
        default:'Processing'
    },
    vehicles:[{
        vehicleId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Vehicle'
        },
        totalDistance:{
            type:String,
            required:true
        },
        perStateDistance:[{
            state:{
                type:String
            },
            distance:{
                type:Number
            },
        }]
    }],
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

const IFTARecord = mongoose.model('IFTARecord',IFTARecordsSchema)
module.exports = IFTARecord