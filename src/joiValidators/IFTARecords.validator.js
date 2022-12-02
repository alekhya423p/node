const joi = require("joi");

exports.iftaDetailsValidator = joi.object({
    searchKey : joi.string().allow(""),
    reportId : joi.string().length(24).required()
})

exports.getIFTAVehicleReportValidator = joi.object({
    recordId : joi.string().length(24).required(),
    vehicleId : joi.string().length(24).required()
})

exports.createIFTAReportValidator = joi.object({
    vehicleIds: joi.array().items(joi.string().length(24).required()),
    startDate : joi.string().required(),
    endDate : joi.string().required()
})