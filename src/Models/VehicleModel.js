const mongoose = require("mongoose")

const vehicleSchema = new mongoose.Schema({
    displayId:{
        type:String,
        default:''
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company'
    },
    vehicleNumber:{
        type:String,
        required:[true,'Please add vehicle number'],
    },
    vehicleMaker:{
        type:String,
        default:''
    },
    vehicleModel:{
        type:String,
        default:''
    },
    vin:{
        type:String,
        required:[true,'Please add vin']
    },
    plateNumber:{
        type:String,
        default:''
    },
    plateState:{
        type:String,
        default:''
    },
    fuelType:{
        type:String,
        enum:['Diesel','Petrol']
    },
    eldConnectionInterface:{
        type:String,
        default:''
    },
    eldId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'ELD'
    },
    year:{
        type:String,
        default:''
    },
    latestVehicleStatusId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'LatestVehicleStatus'
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
vehicleSchema.post("save", async function (doc, next) {
    try {
        console.log(doc)
        let data = await doc
        .model("Vehicle")
        .updateOne({ _id: doc._id }, { displayId: "vehicle:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});
vehicleSchema.set('toJSON', {
    virtuals: true,
    versionKey:false,
    transform: (doc, ret, options) => {
        //delete ret.__v;
        //delete ret._id;
        delete isDeleted;
    },
});
const Vehicle = mongoose.model('Vehicle',vehicleSchema)
module.exports = Vehicle