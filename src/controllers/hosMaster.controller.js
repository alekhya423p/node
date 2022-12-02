const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const StateModel = require("../Models/StatelistModel");
const HosModel = require("../Models/HosRuleModel");
const initHosMasterController = () => {
    const getUSStates = async (req, res) => {
        try {
            const result = await StateModel.find().sort({ state: 1 }).select({ "state": 1, "stateKey": 1 });
            if(!result) return res.status(404).json(errorFunction(false, "Could not fetch states"));
            const {statusCode, body} = getSuccessResponse(result, "States fetched successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            res.status(500).json(errorFunction(false, "Could not fetch states"))
        }
    }
    const getHosRules = async (req, res) => {
       try{
        const hosRules = await HosModel.find();
        if(!hosRules) return res.status(404).json(errorFunction(false, "Could not fetch HOS Rules"));
        const {statusCode, body} = getSuccessResponse(hosRules, "Hosrules fetched successfully", true);
        res.status(statusCode).send(body);
       }catch(err) {
        console.error(err);
        res.status(500).json(errorFunction (false, "Unable to fetch the Hos rules"))
       } 
    }
    return {
        getUSStates,
        getHosRules
    }
}

module.exports = initHosMasterController;