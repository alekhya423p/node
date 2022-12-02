const {Router} = require("express");
const initLogsController = require("../controllers/logs.controller");
const constants = require("../helper/constants");
const { getActiveDriversLogsValidator, getLogsValidator, processedLogsValidator, editFormTechnicianValidator, addEventTechValidator, editBulkEventsValidator, reassignEventTechnicianValidator, removeEventTechnicianValidator } = require("../joiValidators/logs.validator");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();

const logsRouter = () => {
    const {getActiveDrivers, getLogsDetails,generateOutputCSV, processEvents, editFormTechnician,removeViolationTechnician, addEventTechnician, editEventTechnician,editBulkTechnician, reassignEventTechnician, removeEventTechnician } = initLogsController();
    router.route("/getActiveDrivers").get([customValidation(getActiveDriversLogsValidator, "query") , tokenVerification()], getActiveDrivers);
    // in logs after selecting any of the above active drivers
    router.route("/getLogs").get([customValidation(getLogsValidator, "query"), tokenVerification()], getLogsDetails);
    router.route("/processed-events").post([customValidation(processedLogsValidator, "query"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], processEvents)
    router.route("/edit-formtechnician").post([customValidation(editFormTechnicianValidator, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], editFormTechnician)
    
    router.route("/remove-violation/:id").get([customValidation(idValidatorForParams, "params"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], removeViolationTechnician)
    
    router.route("/addEvent-technician").post([customValidation(addEventTechValidator, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], addEventTechnician)
    router.route("/editEvent-technician").post(tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN), editEventTechnician);
    
    router.route("/editBulk-Technician").post([customValidation(editBulkEventsValidator, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], editBulkTechnician)
    router.route("/reassignEvent-technician").post([customValidation(reassignEventTechnicianValidator, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)],reassignEventTechnician)
    router.route("/removeEvent-technician").post([customValidation(removeEventTechnicianValidator, "body"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN)], removeEventTechnician)
    
    
    return router;
}

module.exports = logsRouter;