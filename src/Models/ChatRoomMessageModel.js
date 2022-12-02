const mongoose = require("mongoose");

const chatRoomMessageSchema = new mongoose.Schema(
  {
    sender: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
    ],
    receiver: {
      // confirm if field required or can be done with user field itself
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("ChatRoomMessage", chatRoomMessageSchema);
