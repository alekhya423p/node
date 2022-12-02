require("dotenv").config();
const asyncHandler = require("express-async-handler");
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const { hashPassword } = require("../helper/utils");
const chatModel = require("../Models/ChatModel");
const chatRoomModel = require("../Models/ChatRoomMessageModel");

const initChatController = () => {
  // const getAllLoggedInUsers = async (req, res) => {
  //   const keyword = req.query.search
  //     ? {
  //         $or: [
  //           {
  //             name: { $regex: req.query.search, $options: "i" },
  //           },
  //           {
  //             email: { $regex: req.query.search, $options: "i" },
  //           },
  //         ],
  //       }
  //     : {};
  //   //const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  //   const users = await User.find(keyword).find({
  //     _id: { $ne: req.user._id },
  //   });
  // };

  //const acessChat = async (req, res) => {};
  //@description     Create or fetch One to One Chat
  //@route           POST /chat/acessChat/
  //@access          Protected
  const acessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      console.log("UserId param not sent with request");
      return res.sendStatus(400);
    }

    var isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("users", "-password")
      .populate("latestMessage");

    isChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      var chatData = {
        chatName: "sender",
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      try {
        const createdChat = await Chat.create(chatData);
        const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
          "users",
          "-password"
        );
        res.status(200).json(FullChat);
      } catch (error) {
        res.status(400);
        throw new Error(error.message);
      }
    }
  });

  //@description     Fetch all chats for a user
  //@route           GET /chat/fetchChats
  //@access          Protected
  const fetchChats = asyncHandler(async (req, res) => {
    try {
      Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("latestMessage")
        .sort({ updatedAt: -1 })
        .then(async (results) => {
          results = await User.populate(results, {
            path: "latestMessage.sender",
            select: "name pic email",
          });
          res.status(200).send(results);
        });
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  });

  //@description     Get all Messages
  //@route           GET /chat/Message/:chatId
  //@access          Protected
  const allMessages = asyncHandler(async (req, res) => {
    try {
      const messages = await ChatRoomMessage.find({ chat: req.params.chatId })
        .populate("sender", "name pic email")
        .populate("chat");
      res.json(messages);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  });

  //@description     Create New Message
  //@route           POST /chat/Message/
  //@access          Protected
  const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      console.log("Invalid data passed into request");
      return res.sendStatus(400);
    }

    var newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
    };

    try {
      var message = await ChatRoomMessage.create(newMessage);

      message = await message.populate("sender", "name pic").execPopulate();
      message = await message.populate("chat").execPopulate();
      message = await User.populate(message, {
        path: "chat.users",
        select: "name pic email",
      });

      await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

      res.json(message);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  });

  return {
    acessChat,
    fetchChats,
    allMessages,
    sendMessage,
  };
};
module.exports = initChatController;
