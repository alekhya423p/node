const joi = require("joi");

exports.getHosListDriverValidator = joi.object({
    page: joi.number().required(),
    searchKey: joi.string().allow(""),
    eldStatus: joi.string().valid("", "Connected", "Disconnected"),
    dutyStatus: joi.string().allow(""),
    violationStatus: joi.string().valid("", "compliant_drivers", "violation_n_errors"),
    id : joi.string().length(24),
    companyId : joi.string().length(24),
})

exports.getLogDetailsValidator = joi.object({
    logDriverId: joi.string().length(24).required(),
    logDate: joi.string().optional(),
    id: joi.string().length(24),
    companyId: joi.string().length(24),
    start: joi.string().optional(),
    end: joi.string().optional()
})

exports.addLogEventValidator = joi.object({

    startTime: joi.string().required(),
    vehicleId: joi.string().length(24).required(),
    userId: joi.string().length(24).required(),
    driverStatus: joi.string().required(),
    location: joi.string().required(),
    logDate: joi.string().required(),
    notes: joi.string().allow(""),
    lat: joi.string().allow(""),
    lng: joi.string().allow(""),
    companyId: joi.string().allow(""),
    driverId: joi.string().required(),
    logId: joi.string().required(),

})