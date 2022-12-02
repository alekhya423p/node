const mongoose = require("mongoose")

const unidentifiedEventsSchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company',
        required:[true,'Please add company id'],
    },
    vehicleId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Vehicle',
        required:[true,'Please add vehicle id'],
    },
    eldId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ELD'
    },
    unidentifiedTime:{
        type:Number,
        required:true
    },
    eldEventsList:[{
        vehicleId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Vehicle'
        },
        eldId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'ELD'
        },
        eventCode:{
            type:String,
            default:''
        },
        eventStaus:{
            type:String,
            default:'ACTIVE'
        },
        eventTime:{
            type:String,
            required:true
        },
        odometer:{
            type:Number,
            default:0
        },
        engineHours:{
            type:Number,
            default:0
        },
        calculatedLocation:{
            type:String,
            default:''
        },
        lat:{
            type:String,
            default:''
        },
        lng:{
            type:String,
            default:''
        },
        source:{
            type:String,
            default:'ELDConnected'
        },
        positioning:{
            type:String,
            default:'AUTO'
        },
        state:{
            type:String,
            default:''
        },
        timestamp:{
            type:Date
        },
        desciption:{
            type:String,
            default:''
        },
        notes:{
            type:String,
            default:''
        },
        accumulatedVehicleMiles:{
            type:Number,
            default:0
        },
        dayLightSavingsTime:{
            type:Boolean,
            default:true
        }, 
        
        recordOrigin:{
            type:String,
            default:'UNIDENTIFIED_DRIVER'
        },                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
        seqId:{
            type:Number,
            default:0
        },
        isLive:{
            type:Boolean,
            default:true
        },
        diagnosticIndicatorStatus:{
            type:Boolean,
            default:true
        },
        malfunctionIndicatorStatus:{
            type:Boolean,
            default:true
        },
    }],
    // odometer:{
    //     type:Number,
    //     default:0
    // },
    // engineHours:{
    //     type:Number,
    //     default:0
    // },
    // calculatedLocation:{
    //     type:String,
    //     default:''
    // },
    // lat:{
    //     type:String,
    //     default:''
    // },
    // lng:{
    //     type:String,
    //     default:''
    // },
    // source:{
    //     type:String,
    //     default:'ELDConnected'
    // },
    // positioning:{
    //     type:String,
    //     default:'AUTO'
    // },
    // state:{
    //     type:String,
    //     default:''
    // },
    // timestamp:{
    //     type:Date
    // },
    // desciption:{
    //     type:String,
    //     default:''
    // },
    // notes:{
    //     type:String,
    //     default:''
    // },
    // accumulatedVehicleMiles:{
    //     type:Number,
    //     default:0
    // },
    // dayLightSavingsTime:{
    //     type:Boolean,
    //     default:true
    // }, 
    // eventCode:{
    //     type:String,
    //     default:''
    // },
    // eventStaus:{
    //     type:String,
    //     default:''
    // },
    // eventTime:{
    //     type:Date
    // },
    // recordOrigin:{
    //     type:String,
    //     default:'UNIDENTIFIED_DRIVER'
    // },                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
    // seqId:{
    //     type:Number,
    //     default:0
    // },
    // isLive:{
    //     type:Boolean,
    //     default:true
    // },
    // diagnosticIndicatorStatus:{
    //     type:Boolean,
    //     default:true
    // },
    // malfunctionIndicatorStatus:{
    //     type:Boolean,
    //     default:true
    // },
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
unidentifiedEventsSchema.post("save", async function (doc, next) {
    try {
        let data = await doc
        .model("UnidentifiedEvent")
        .updateOne({ _id: doc._id }, { displayId: "eldEvent:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});
const UnidentifiedEvent = mongoose.model('UnidentifiedEvent',unidentifiedEventsSchema)
module.exports = UnidentifiedEvent