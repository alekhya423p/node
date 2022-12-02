const {Router} = require("express");
const initAssetsController = require("../controllers/assets.controller");
const { getAllEldEventsValidator } = require("../joiValidators/eldEvents.validator");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");
const { customValidation, tokenVerification } = require("../Middlewares/validation");
const router = Router();
const assetsRouter = () => {
    const {getAllAssets, getAssetDetails} = initAssetsController();
    
    router.route("/getAssets").get([customValidation(getAllEldEventsValidator, "query"), tokenVerification()], getAllAssets);
    router.route("/assetDetail/:id").get([customValidation(idValidatorForParams, "params"), tokenVerification()], getAssetDetails)
    return router;
}

module.exports = assetsRouter;

