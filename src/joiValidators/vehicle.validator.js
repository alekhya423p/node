const joi = require("joi")
const vinMatchReg = /^(?!.*I|.*Q|.*O).*$/;
exports.getAllVehicleQueryValidator = joi.object({
    page : joi.number().allow("").required(),
    searchStatus : joi.string().valid("active", "inactive").allow("").required(),
    searchKey : joi.string().allow(""),
    id : joi.string().length(24),
    companyId : joi.string().length(24)
})
exports.editVehicleValidator = joi.object({
    vehicleNumber: joi.string().trim(true).min(1).max(10).required(),
    make: joi.string().trim(true).min(1).max(25).required(),
    model: joi.string().trim(true).max(25).required(),
    year: joi.number().required(),
    vin: joi.string().regex(vinMatchReg).length(17).trim(true).required(),
    fuelType: joi.string().valid("Diesel", "Petrol").required(),
    plateNumber: joi.string().required(),
    eld: joi.string().allow(""),
    vehicleModel: joi.string().allow("").trim(true).max(25),
    plateLicenseState: joi.string().required(),
    id: joi.string().length(24),
})