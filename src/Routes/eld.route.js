const { Router } = require("express");
const router = Router();
const initEldController = require("../controllers/eld.controller");
const { deleteDriverValidator } = require("../joiValidators/Driver.validator");
const { manageELDValidator, unassignELDValidator } = require("../joiValidators/ELD.validator");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { getAllVehicleQueryValidator } = require("../joiValidators/vehicle.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const constants = require("../helper/constants");
const eldRouter = () => {
    const { getEldMasterList, getAllELDS,createELD, getEldDetail,deactivate, deleteELD, unassignEld } = initEldController();

    router.route("/eldMaster").get(tokenVerification(), getEldMasterList)
    router.route("/getAll").get([customValidation(getAllVehicleQueryValidator, "query"), tokenVerification()], getAllELDS)
    router.route(["/create", "/edit"]).post([customValidation(manageELDValidator, "body"),tokenVerification()], createELD)
    router.route("/get/:id").get([customValidation(idValidatorForParams, "params"), tokenVerification()], getEldDetail)
    router.route("/deactivate").post([customValidation(deleteDriverValidator, "body"), tokenVerification()], deactivate)
    router.route("/delete").put([customValidation(idValidatorForParams, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], deleteELD)
    router.route("/unassignEld").post([customValidation(unassignELDValidator, "body"), tokenVerification()], unassignEld)
    return router;
}

module.exports = eldRouter;