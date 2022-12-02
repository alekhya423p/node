const mongoose = require("mongoose");
//const { ObjectId } = mongoose.Schema.Types;
const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
      trim: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
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
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoomMessage",
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    room_id: {
      //room_id referencing objectid of ChatRoomMessage for socketid created on joining chat
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoomMessage",
    },
    seen: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Chat", chatSchema);
