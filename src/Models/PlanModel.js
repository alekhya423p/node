const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    planId:{
        type:String,
        default:''
      },
      stripePriceId:{
        type:String,
        default:''
      },
      stripeProductId:{
        type:String,
        default:''
      },
      planName:{
        type:String,
        default:''
      },
      vehicleCount:{
        type:Number,
        default:0
      },
      price:{
        type:Number,
        default:''
      },
      description:{
        type:String,
        default:''
      },
      addedOn:{
        type:Date,
        default:''
      }
});

// subscriptionSchema.post("save", async function (doc, next) {
//   try {
//       console.log(doc)
//       let data = await doc
//       .model("subscriptions")
//       .updateOne({ _id: doc._id }, { date: new Date('yyyy-mm-dd') });
//   } catch (error) {
//     console.log("get -> error", error);
//     next(error);
//   }
// });

// companyId:{
//     type:mongoose.Schema.Types.ObjectId,
//     ref:'Company'
//   },

//console.log("-------------------->")
const Plan = mongoose.model("plan", planSchema);
module.exports = Plan ;


