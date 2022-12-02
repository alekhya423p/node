const mongoose = require('mongoose')
const companySchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyName:{
        type:String,
        required:[true,'Please add company name'],
    },
    phoneNumber:{
        type:String,
        default:''
    },
    stripeCustomerId:{
        type:String
    },
    dotNumber:{
        type:String,
        default:''
    },
    address:{
        type:String,
        default:''
    },
    terminals:[{
        displayId:{
            type:String,
            default:''
        },
        address:{
            type:String,
            default:''
        },
        timeZone:{
            type:String,
            enum:['','America/Chicago','America/Denver','America/Los_Angeles','Asia/Kuala_Lumpur','America/Bermuda','America/Anchorage','Pacific/Honolulu', 'America/New_York']
        },
        logStartOffSet:{
            type:Number,
            default:0
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
        }
    }],
    pcAllowed:{
        type:Boolean,
        default:true
    },
    ymAllowed:{
        type:Boolean,
        default:true
    },
    shortHaulAllowed:{
        type:Boolean,
        default:true
    },
    splitSBAllowed:{
        type:Boolean,
        default:true
    },
    manualDriveAllowed:{
        type:Boolean,
        default:true
    },
    exempt:{
        type:Boolean,
        default:false
    },
    cycle:{
        type:String,
        default:''
    },
    cargoType:{
        type:String,
        enum:['','PROPERTY','PASSENGER'],
        default:''
    },
    restartHours:{
        type:String,
        default:''
    },
    restBreak:{
        type:String,
        default:''
    },
    complianceMode:{
        type:String,
        default:''
    },
    allowGPSTracking:{
        type:Boolean,
        default:true
    },
    allowLiveTracking:{
        type:Boolean,
        default:true
    },
    allowIFTA:{
        type:Boolean,
        default:true
    },
    project44:{
        type:Boolean,
        default:true
    },
    macropoint:{
        type:Boolean,
        default:false
    },
    // liveShareLinks:[{
    //     displayId:{
    //         type:String,
    //         default:''
    //     },
    //     link:{
    //         type:String,
    //         default:''
    //     },
    //     driverInfoAllowed:{
    //         type:Boolean,
    //         default:false
    //     },
    //     driverFormInfoAllowed:{
    //         type:Boolean,
    //         default:true
    //     },
    //     expirationDate:{
    //         type:String,
    //         default:''
    //     },
    //     createdBy:{
    //         type:mongoose.Schema.Types.ObjectId,
    //         ref:'User'
    //     },
    //     updatedBy:{
    //         type:mongoose.Schema.Types.ObjectId,
    //         ref:'User'
    //     },
    //     createdAt:{
    //         type:Date,
    //         default: Date.now
    //     },
    //     updatedAt:{
    //         type:Date,
    //         default: Date.now
    //     }
    // }],
    vehicleMotionThreshold:{
        type:Number,
        default:0
    },
    timeZoneId:{
        type:String,
        //enum:['','EST','CST','MST','PST','UTC','AST','AKST','HST'],
        enum:['','America/Chicago','America/Denver','America/Los_Angeles','Asia/Kuala_Lumpur','America/Bermuda','America/Anchorage','Pacific/Honolulu','America/New_York'],
        default:''
    },
    // createdBy:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref:'User'
    // },
    // updatedBy:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref:'User'
    // },
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
companySchema.post("save", async function (doc, next) {
    try {
        console.log(doc)
        let data = await doc
        .model("Company")
        .updateOne({ _id: doc._id }, { displayId: "company:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});
const Company = mongoose.model('Company',companySchema)
module.exports = Company