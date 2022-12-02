const {Router} = require("express");
const initDashboardRouter = require("../controllers/dashboard.controller");
const { locationHistoryValidator, dashboardStatusValidator } = require("../joiValidators/dashboard.validator");
const router = Router();
const {customValidation,tokenVerification} = require("../Middlewares/validation");

const dashboardRouter = () => {
    const {getLocationHistory, getDashboardStatus, getCounts } = initDashboardRouter();
    router.route("/locationHistory").get([customValidation(locationHistoryValidator, "query"), tokenVerification()], getLocationHistory)
    router.route("/getStatus").get([customValidation(dashboardStatusValidator, "query"),tokenVerification()], getDashboardStatus)   
    router.route("/getCounts").get(tokenVerification(), getCounts)
    
    return router;
}

module.exports = dashboardRouter;