const {Router} = require("express");
const initOutputCSVController = require("../controllers/outputCSV.controller");
const { generateOutputCSVValidator } = require("../joiValidators/outputCSV.validator");
const {tokenVerification, customValidation } = require("../Middlewares/validation"); 
const router = Router();
const outputCSVRouter = () => {
    const {generateOutputCSV} = initOutputCSVController();
    router.route("/generate").post([customValidation(generateOutputCSVValidator, "body"), tokenVerification()], generateOutputCSV)
    return router;
}

module.exports = outputCSVRouter;