const {Router} = require("express");
const router = Router ();
const initEldEventsController = require("../controllers/eldEvents.controller");
const constants = require("../helper/constants");
const { getAllEldEventsValidator, assignDriverValidator, unidentifiedEventsValidator } = require("../joiValidators/eldEvents.validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");

const eldEventsRouter = () => {
    const {getAllEvents, assignDriverEldEvents, getUnidentifiedEventsEld} = initEldEventsController();
    router.route("/getAllEvents").get([customValidation(getAllEldEventsValidator, "query"), tokenVerification()], getAllEvents);
    router.route("/assignDriver").post([customValidation(assignDriverValidator, "query"), tokenVerification(constants.ROLES.COMPANY_ADMINISTRATOR_FOR_ALL_USER)], assignDriverEldEvents)
    router.route("/unidentifiedEvents").get([customValidation(unidentifiedEventsValidator, "query"), tokenVerification()], getUnidentifiedEventsEld)
    return router;
}

module.exports = eldEventsRouter;