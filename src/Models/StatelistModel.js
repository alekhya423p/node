const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  displayText: {
    type: String
  },
  state: {
    type: String
  },
  stateKey:{
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

const StateList = mongoose.model("StateList", schema);
module.exports = StateList ;
