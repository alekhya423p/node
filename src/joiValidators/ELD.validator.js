const joi = require("joi");
const VALIDATE_MAC_ADDRESS = /^(([A-Fa-f0-9]{2}[:]){5}[A-Fa-f0-9]{2}[,]?)+$/i;
const ALPHABATES_NUMERIC = /^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$/;

exports.manageELDValidator = joi.object({
    macAddress : joi.string().regex(VALIDATE_MAC_ADDRESS).trim(true).required(),
    serialNumber : joi.string().regex(ALPHABATES_NUMERIC).trim(true).required(),
    eldModel : joi.string().required().allow(""),
    fwVersion : joi.string().allow(""),
    vehicleId : joi.string().allow(""),
    id: joi.string(),
    companyId : joi.string()
})

exports.unassignELDValidator = joi.object({
    vehicleId : joi.string().length(24).required()
})