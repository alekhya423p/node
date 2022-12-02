const joi = require("joi");

exports.locationHistoryValidator = joi.object({
    id : joi.string().length(24),
    companyId : joi.string().length(24),
    vehicleId : joi.string().length(24).required(),
    searchDate : joi.string().required()
})



exports.dashboardStatusValidator = joi.object({
    id : joi.string().length(24),
    companyId : joi.string().length(24),
    truckStatus : joi.string().valid("", "IN_MOTION", "STATIONARY"),
    dutyStatus : joi.string().valid("", "DS_D","DS_ON","DS_OFF","DS_SB","DR_IND_PC","DR_IND_YM").required(),
    orderBy : joi.string().valid("-1", "1").required(),
    searchKey : joi.string().allow("")
});
