const {Router } = require("express");
const initDriverHosRouter = require("../controllers/driverHos.controller");
const { getHosListDriverValidator, getLogDetailsValidator, addLogEventValidator } = require("../joiValidators/driverHos.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();



const driverHosRouter = () => {
    const {getHosList, getHOSDriverDetails, getAllEventCodesController, getResponsibleUsers, getLogDetail, getReportPDFLogs, addEvent} = initDriverHosRouter ();
    router.route("/getHosList").get([customValidation(getHosListDriverValidator, "query"), tokenVerification() ], getHosList);
    router.route("/driverDetails").get(tokenVerification(), getHOSDriverDetails)
    // apis for the log sections of the driver hos
    
    router.route("/getEventCode").get(tokenVerification(), getAllEventCodesController);
    router.route("/getResponsibleUsers").get(tokenVerification(), getResponsibleUsers)
    router.route("/getLogDetail").get([customValidation(getLogDetailsValidator, "query") , tokenVerification()], getLogDetail)
    router.route("/reports/pdfLogs").get([customValidation(getLogDetailsValidator, "query") , tokenVerification()], getReportPDFLogs)
    router.route("/addEvent").post([customValidation(addLogEventValidator, "body"), tokenVerification()], addEvent)
    return router
}

module.exports = driverHosRouter