const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  displayId:{
    type:String,
    default:''
  },
  companyId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Company'
  },
  userName:{
    type:String,
    required:[true,'Please add userName'],
    trim:true,
    unique:false
  },
  firstName:{
    type:String,
    default:''
  },
  lastName:{
    type:String,
    default:''
  },
  email:{
    type:String,
  //  required:[true,'Please add an valid email'],
    trim:true,
    unique:false,
    // match:[
    //     /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,'Please add a valid email'
    // ]
  },
  password:{
    type:String,
    required:[true,'Please provide password'],
    trim:true,
  },
  timeLogin:{
    type:String,
    default:""
  },
  phoneNumber:{
    type:String,
    default:''
  },
  resetPasswordToken:{
    type:String,
    default:''
  },
  resetPasswordExpires:{
    type:Date
  },
  licenseNumber:{
    type:String,
    default:''
  },
  licenseState:{
    type:String,
    default:''
  },
  latestDriverStatusId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'LatestDriverStatus'
  },
  coDriverId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Driver'
  },
  assignedVehicleId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Vehicle'
  },
  homeTerminal:{
    type:String,
    default:''
    //need to change this later
  },
  pcAllowed:{
    type:Boolean,
    default:true
  },
  ymAllowed:{
    type:Boolean,
    default:true
  },
  manualDriveAllowed:{
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
    enum:['','PROPERTY','PASSENGER']
  },
  restartHours:{
    type:String,
    enum:['','34H','24H']
  },
  restBreak:{
    type:String,
    default:''
  },
  batteryLevel:{
    type:String,
    default:''
  },
  batteryOptimization:{
    type:Boolean,
    default:true
  },
  bluetoothEnabled:{
    type:Boolean,
    default:true
  },
  locationEnabled:{
    type:Boolean,
    default:true
  },
  wifiEnabled:{
    type:Boolean,
    default:true
  },
  eldConnection:{
    type:Boolean,
    default:true
  },
  storageAllowed:{
    type:Boolean,
    default:true
  },
  drawOverAllowed:{
    type:Boolean,
    default:true
  },
  systemSoundAllowed:{
    type:Boolean,
    default:true
  },
  os:{
    type:String,
    default:''
  },
  osVersion:{
    type:String,
    default:''
  },
  appVersion:{
    type:String,
    default:''
  },
  deviceUpdatedOn:{
    type:Date
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
});
driverSchema.post("save", async function (doc, next) {
  try {
      let data = await doc
      .model("Driver")
      .updateOne({ _id: doc._id }, { displayId: "driver:"+doc._id });
  } catch (error) {
    console.log("get -> error", error);
    next(error);
  }
});
const Driver = mongoose.model('Driver',driverSchema)
module.exports = Driver
