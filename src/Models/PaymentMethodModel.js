const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema({
    paymentMethodId:{
        type:String,
        default:''
      },
      customerId:{
        type:String,
        default:''
      },
      addedOn:{
        type:Date,
        default:Date.now
      },
      defaultPaymentMethod:{
        type:Boolean,
        default:false
      },
});

const PaymentMethod = mongoose.model("paymentMethod", paymentMethodSchema);
module.exports = PaymentMethod ;


