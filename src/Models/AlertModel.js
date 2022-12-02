const mongoose = require('mongoose')
const alertSchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company'
      },
    name:{
        type:String,
        default:''
    },
    alertType:{
        type:String,
        enum:['','SPEEDING','DEVICE_DISCONNECTION','HOS_VIOLATION_DRIVING','HOS_VIOLATION_DRIVING','HOS_VIOLATION_SHIFT','HOS_VIOLATION_CYCLE'],
        default:''
    },
    monitorVehicles:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Vehicle'
    }],
    alertSpeed:{
        type:Number,
        default:''
    },
    monitorDrivers:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Driver'
    }],
    monitorAllDrivers:{
        type:Boolean,
        default:false
    },
    monitorAllVehicles:{
        type:Boolean,
        default:false
    },
    smsNotification:{
        type:String,
        default:''
    },
    emailNotification:{
        type:String,
        trim:true,
        unique:false,
        match:[
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,'Please add a valid email']
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
alertSchema.post("save", async function (doc, next) {
    try {
        console.log(doc)
        let data = await doc
        .model("Alert")
        .updateOne({ _id: doc._id }, { displayId: "alerts:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});
const Alert = mongoose.model('Alert',alertSchema)
module.exports = Alert