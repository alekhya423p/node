const {Router} = require("express");
const initResourcesController = require("../controllers/resources.controller");
const { tokenVerification } = require("../Middlewares/validation");
const router = Router();

const resourcesRouter = () => {
    const { getResourceList } = initResourcesController();
    router.route("/getResourceList").get(tokenVerification(),getResourceList);
    return router;
}

module.exports = resourcesRouter;