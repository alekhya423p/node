const {Router} = require("express");
const router = Router();
const initHosMasterController = require("../controllers/hosMaster.controller");
const hosMasterRouter = () => {
    const {getUSStates, getHosRules} = initHosMasterController();
    
    router.route("/stateGetAll").get(getUSStates);
    router.route("/hosGetAll").get(getHosRules)
    return router;
}

module.exports = hosMasterRouter;