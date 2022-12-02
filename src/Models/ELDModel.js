const mongoose = require("mongoose")

const eldSchema = new mongoose.Schema({
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
    },
    serialNumber:{
        type:String,
        required:[true,'Please add serialNumber'],
    },
    macAddress:{
        type:String,
        //required:[true,'Please add macAddress'],
    },
    eldModel:{
        type:String,
        required:[true,'Please add eldModel'],
    },
    fwVersion:{
        type:String,
        default:''
    },
    bleVersion:{
        type:String,
        default:''
    },
    //malfunctions:[],
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

// eldSchema.set('toJSON', {
//     virtuals: true,
//     transform: (doc, ret, options) => {
//         delete ret.__v;
//         delete ret._id;
//     },
    
// });
eldSchema.post("save", async function (doc, next) {
    try {
        let data = await doc
        .model("ELD")
        .updateOne({ _id: doc._id }, { displayId: "eld:"+doc._id });
    } catch (error) {
      console.log("get -> error", error);
      next(error);
    }
});

const ELD = mongoose.model('ELD',eldSchema)
module.exports = ELD