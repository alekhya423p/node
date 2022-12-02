const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  displayText: {
    type: String
  },
  rule: {
    type: String
  },
  cycleTime:{
    type: String
  },
  recapValue:{
    type: String
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

const HosRule = mongoose.model("HosRule", schema);
module.exports = HosRule ;
