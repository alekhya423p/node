const {Router} = require("express");
const constant = require("../helper/constants")
const initPortalUserController = require("../controllers/portalUser.controller");
const { createPortalUserValidator, getAllQueryValidators, idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();

const portalUserRouter = () => {
    const {createPortalUser, getAllPortalUser, getPortalUser, deactivatePortalUser} = initPortalUserController();

    router.route(["/createPortalUser", "/editPortalUser"]).post([tokenVerification(), customValidation(createPortalUserValidator, "body")], createPortalUser)
    router.route("/getPortalUsersAll").get(tokenVerification(), getAllPortalUser)
    router.route("/getPortalUser/:id").get([customValidation(idValidatorForParams, "params"), tokenVerification()], getPortalUser)
    router.route(`/deactivatePortalUser/:id`).put([customValidation(idValidatorForParams, "params"), tokenVerification(constant.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN)], deactivatePortalUser)
    
    return router;
}

module.exports = portalUserRouter;