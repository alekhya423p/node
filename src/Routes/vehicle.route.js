const {Router} = require("express");
const initVehicleController = require("../controllers/vehicle.controller");
const { deleteDriverValidator } = require("../joiValidators/Driver.validator");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { getAllVehicleQueryValidator, editVehicleValidator } = require("../joiValidators/vehicle.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();

const vehicleRouter = () => {
    const {getMasterVehicleList,
            getAllVehicle,
            getActiveVehicleCount,
            getVehicleDetails,
            editVehicle,
            deactivate
        } = initVehicleController();
    
    router.route("/vehicleMaster").get(tokenVerification(), getMasterVehicleList);
    router.route("/getAllVehicle").get(tokenVerification(), customValidation(getAllVehicleQueryValidator, "query"), getAllVehicle)
    router.route("/activeVehicleList").get(tokenVerification(), getActiveVehicleCount)
    router.route("/getVehicleInfo/:id").get([customValidation(idValidatorForParams, "params"),tokenVerification()], getVehicleDetails)
    router.route(["/edit", "/create"]).post([tokenVerification(), customValidation(editVehicleValidator, "body")], editVehicle);
    router.route("/deactivate").post([tokenVerification(), customValidation(deleteDriverValidator)], deactivate);
    
    return router;
}

module.exports = vehicleRouter;