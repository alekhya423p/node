const { Router } = require("express");
const initIFTARecordsController = require("../controllers/IFTARecords.controller");
const { iftaDetailsValidator, getIFTAVehicleReportValidator, createIFTAReportValidator } = require("../joiValidators/IFTARecords.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();
const IFTARecords = () => {
    const { getIFTAReports, getDetails, getIFTAVehicleReport, createReport } = initIFTARecordsController()

    router.route("/getReports").get(tokenVerification(), getIFTAReports)
    router.route("/reports/details").get([customValidation(iftaDetailsValidator, "query"), tokenVerification()], getDetails);
    router.route("/getReport/:recordId/vehicle/:vehicleId").get([customValidation(getIFTAVehicleReportValidator, "params"), tokenVerification()], getIFTAVehicleReport)
    router.route("/createReport").post([customValidation(createIFTAReportValidator, "body"), tokenVerification()], createReport);

    return router;
}

module.exports = IFTARecords;