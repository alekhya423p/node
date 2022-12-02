const {Router} = require("express");
const router = Router();
const initDriverController = require("../controllers/driver.controller");
const { createDriverValidator, deleteDriverValidator } = require("../joiValidators/Driver.validator");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");

const driverRouter = () => {
    const {createDriver, getAllDrivers, getDriver, deactivateDriver} = initDriverController();

    router.route(["/createDriver", "/editDriver"]).post(tokenVerification(),[customValidation(createDriverValidator, "body")], createDriver);
    router.route("/getDriverList").get(tokenVerification(), getAllDrivers);
    router.route("/getDriver/:id").get([customValidation(idValidatorForParams, "params"), tokenVerification()], getDriver)
    router.route("/deactivate").post([customValidation(deleteDriverValidator, "body"), tokenVerification()], deactivateDriver);
    
    return router;
}

module.exports = driverRouter;