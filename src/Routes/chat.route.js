const { Router } = require("express");
const initChatController = require("../chatControllers/chat.controller");
const initChatUserController = require("../controllers/user.controller");
const initChatDriverController = require("../controllers/driver.controller");
const {
  tokenVerification,
  customValidation,
} = require("../Middlewares/validation");
const {
  createDriverValidator,
  deleteDriverValidator,
} = require("../joiValidators/Driver.validator");
const router = Router();
const constants = require("../helper/constants");
const {
  idValidatorForParams,
} = require("../joiValidators/portalUser.validator");

const chatRouter = () => {
  const { acessChat, fetchChats, allMessages, sendMessage, chatMessage } =
    initChatController();

  const { loginUser, createUser, getSystemUsersList } =
    initChatUserController();

  const { createDriver, getAllDrivers } = initChatDriverController();

  // router.route("/getAllUsers").get([tokenVerification()], getAllLoggedInUsers);
  router
    .route(["/createDriver", "/editDriver"])
    .post(
      tokenVerification(),
      [customValidation(createDriverValidator, "body")],
      createDriver
    );
  router.route("/getDriverList").get(tokenVerification(), getAllDrivers);
  router
    .route("/getSystemUsers")
    .get([tokenVerification()], getSystemUsersList);
  //router.route("/acessChat").post(tokenVerification(), acessChat);
  router.route("/").post(tokenVerification(), acessChat);
  //router.route("/fetchChats").get(tokenVerification(), fetchChats);
  router.route("/").get(tokenVerification(), fetchChats);
  router.route("/allMessages").post(tokenVerification(), allMessages);
  router.route("/sendMessage").post(tokenVerification(), sendMessage);

  return router;
};
module.exports = chatRouter;
