const { Router } = require("express");
const router = Router();
const initFMCSAController = require("../controllers/FMCSA.controller");
const { fmcsaGetValidator } = require("../joiValidators/fmcsa.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const fmcsaRouter = () => {
    const { getFMCSAReports, getFMCSATransferLogsSystem } = initFMCSAController();
    router.route("/getReports").get([customValidation(fmcsaGetValidator, "query"), tokenVerification()], getFMCSAReports)
    router.route("/getFMCSATransferLogs").get(tokenVerification(), getFMCSATransferLogsSystem)
    
    return router;
}

module.exports = fmcsaRouter;