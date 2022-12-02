const mongoose = require("mongoose")

const dailyLogSchema = new mongoose.Schema({
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
    coDriverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Driver'
    },
    vehicles:[{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Vehicle'
        }
    }],
    logDate:{
        type:Date,
        required:[true,'Please add logDate'],
    },
    timeZone:{
        type:String,
        required:[true,'Please add timeZone'],
    },
    dayLightSavingsTime:{
        type:Boolean,
        default:false
    },
    logStartOffset:{
        type:Number,
        default:0
    },
    timeDriven:{
        type:Number,
        default:0
        //in seconds
    },
    timeOnDuty:{
        type:Number,
        default:0
        //in seconds
    },
    isCertified:{
        type:Boolean,
        default:false
    },
    hasForm:{
        type:Boolean,
        default:false
    },
    trailers:[],
    shippingDocuments:[],
    violations:[{
        regulation:{
            type:String,
            default:''
        },
        startTime:{
            type:Date
        },
        endTime:{
            type:Date
        }
    }],
    hasFormErrors:{
        type:Boolean,
        default:true
    },
    hasViolation:{
        type:Boolean,
        default:false
    },
    shiftStart:{
        type:Date
    },
    cycleStart:{
        type:Date
    },
    lastsync:{
        type:Date,
        default: new Date()
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

dailyLogSchema.post("save", async function (doc, next) {
    try {
        let data = await doc
        .model("DailyLog")
        .updateOne({ _id: doc._id }, { displayId: "dailyLog:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});

const DailyLog = mongoose.model('DailyLog',dailyLogSchema)
module.exports = DailyLog