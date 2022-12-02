const mongoose = require("mongoose")

const HOSEventsSchema = new mongoose.Schema({
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
        ref:'Driver'
    },
    vehicleId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Vehicle',
       // required:[true,'Please add vehicle id']
    },
    eldId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ELD'
    },
    logId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'DailyLog'
    },
    seqId:{
        type:String,
        default:''
    },
    logDate:{
        type:Date,
        required:true
    },
    timezone:{
        type:String,
        default:''
    },
    odometer:{
        type:String,
        default:''
    },
    engineHours:{
        type:String,
        default:''
    },
    dayLightSavingsTime:{
        type:Boolean,
        default:false
    },
    eventCode:{
        type:String,
        enum:['DS_OFF','DS_SB','DS_D','DS_ON','DS_WT','DR_IND_YM','DR_LOGIN','DR_IND_PC','ELD_DIAG_CLEARED','ELD_DIAG','ELD_MALF_CLEARED','ELD_MALF','ENG_DOWN_REDUCED','ENG_DOWN_NORMAL','ENG_UP_REDUCED','ENG_UP_NORMAL','DR_LOGOUT','DR_CERT_1','DR_CERT_2','DR_CERT_3','DR_CERT_4','DR_CERT_5','DR_CERT_6','DR_CERT_7','DR_CERT_8','DR_CERT_9','DR_IND_CLEARED','INTER_REDUCED_PERCISION','INTER_NORMAL_PRECISION'],
        default:'DS_OFF',
        required:true
    },
    eventStatus:{
        type:String,
        enum:['ACTIVE','INACTIVE_CHANGED','INACTIVE_CHANGE_REQUESTED','INACTIVE_CHANGE_REJECTED'],
        default:'ACTIVE'
    },
    eventDateTime:{
        type:Date,
    },
    eventEndDateTime:{
        type:Date,
    },
    eventTime:{
        type:String,
        default:''
    },
    recordOrigin:{
        type:String,
        enum:['AUTO','DRIVER','OTHER_USER','UNIDENTIFIED_DRIVER'],
        default:'AUTO'
    },
    manualLocation:{
        type:String,
        default:''
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
        default:''
    },
    positioning:{
        type:String,
        default:''
    },
    state:{
        type:String,
        default:''
    },
    timestamp:{
        type:String,
        default:''
    },
    notes:{
        type:String,
        default:''
    },
    certifiedRecordDate:{
        type:String,
        default:''
    },
    editRequestedByUserId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    suggestedEditEventsId:{
        type:String,
        default:''
    },
    accumulatedVehicleMiles:{
        type:Number,
        default:0
    },
    elapsedEngineHours:{
        type:Number,
        default:0
    },
    distSinceLastValidCoords:{
        type:Number,
        default:0
    },
    diagnosticIndicatorStatus:{
        type:Boolean,
        default:false
    },
    malfunctionInsdicatorStatus:{
        type:Boolean,
        default:false
    },
    malfunctionAndDiagnosticCode:{
        type:String,
        default:''
    },
    isLive:{
        type:Boolean,
        default:true
    },
    inspection:{
        type:Boolean,
        default:false
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

HOSEventsSchema.set('toJSON', {
    virtuals: false,
    versionKey:false,
    transform: (doc, ret, options) => {
        delete isDeleted;
    },
});
HOSEventsSchema.post("save", async function (doc, next) {
    try {
        let data = await doc
        .model("HOSEvent")
        .updateOne({ _id: doc._id }, { displayId: "hosEvents:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});

const HOSEvent = mongoose.model("HOSEvent", HOSEventsSchema);
module.exports = HOSEvent
