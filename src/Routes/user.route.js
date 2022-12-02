const { Router } = require("express");
const initUserController = require("../controllers/user.controller");
// validation
const {
  customValidation,
  tokenVerification,
} = require("../Middlewares/validation");

// validation middlewares
const {
  loginValidator,
  registerValidator,
  verifyUserMailValidator,
  changePasswordValidator,
  generalEmail,
  updateUserValidator,
} = require("../joiValidators/user.validator");
const {
  idValidatorForParams,
} = require("../joiValidators/portalUser.validator");
const {
  getAllVehicleQueryValidator,
} = require("../joiValidators/vehicle.validator");
const constants = require("../helper/constants");
const {
  updateCompanyValidator,
} = require("../joiValidators/Company.Validator");

const router = Router();

const userRouter = () => {
  const {
    loginUser,
    createUser,
    verifyUser,
    getProfileUser,
    changePassword,
    forgotPassword,
    refreshUserToken,
    getSystemUsersList,
    refreshTokenSystemUser,
    updateProfileUser,
  } = initUserController();

  router
    .route("/login")
    .post(customValidation(loginValidator, "body"), loginUser);
  router
    .route("/register")
    .post(customValidation(registerValidator, "body"), createUser);
  router
    .route("/verify")
    .get(customValidation(verifyUserMailValidator, "body"), verifyUser);
  router.route("/getProfileUser").get(tokenVerification(), getProfileUser);
  router
    .route("/changePasswordUser")
    .post(
      [customValidation(changePasswordValidator, "body"), tokenVerification()],
      changePassword
    );
  router
    .route("/forgotPasswordUser")
    .post([customValidation(generalEmail, "body")], forgotPassword);

  // TO BE DISCUSSED
  // router.route("/resetPassword")
  router
    .route("/refresh-token/:id")
    .get(
      [
        customValidation(idValidatorForParams, "params"),
        tokenVerification(
          constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN
        ),
      ],
      refreshUserToken
    );
  router
    .route("/getSystemUsers")
    .get(
      [
        customValidation(getAllVehicleQueryValidator, "query"),
        tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN),
      ],
      getSystemUsersList
    );
  router
    .route("/refreshSystemUser")
    .get(tokenVerification(), refreshTokenSystemUser);
  router
    .route("/updateCompanyUser")
    .post(
      [customValidation(updateCompanyValidator, "body"), tokenVerification()],
      updateProfileUser
    );
  return router;
};

module.exports = userRouter;
