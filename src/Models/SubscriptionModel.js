const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    stripeSubscriptionId:{
        type:String,
        default:''
      },
      companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company'
      },
      planId:{
        type:String,
        default:''
      },
      price:{
        type:String,
        default:''
      },
      vehicleCount:{
        type:Number,
        default:0
      },
      date:{
        type:Date,
        default:''
      },
      paymentType:{
        type:String,
        enum:['card','bank_transfer']
      },
      paymentMethodId:{
        type:String
      },
      customerId:{
        type:String
      },
      status:{
        type:String
      }
});

//console.log("-------------------->")
const Subscription = mongoose.model("subscriptions", subscriptionSchema);
module.exports = Subscription ;


