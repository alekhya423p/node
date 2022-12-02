const joi = require("joi");

exports.getAllEldEventsValidator = joi.object({
    id : joi.string().length(24),
    page : joi.number().allow("").required(),
    companyId : joi.string().length(24),
    searchKey : joi.string().allow(""),
})

exports.assignDriverValidator = joi.object({
    vehicleId : joi.string().length(24).required(),
    driverId : joi.string().length(24).required(),
    eventIds : joi.array().items(joi.string().length(24)).required()
})

exports.unidentifiedEventsValidator = joi.object({
    vehicleId : joi.string().length(24).required(),
    page : joi.number().allow("").valid("1", "-1").required(),
    searchDate : joi.date().required()
})