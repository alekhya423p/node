const joi = require("joi");

exports.updateCompanyValidator = joi.object({
    email : joi.string().email().trim(true),
    firstName : joi.string().required(),
    lastName : joi.string().required(),
    password : joi.string().min(8).max(14).trim(true)
})

exports.companyListValidator = joi.object({
    searchStatus : joi.string().allow("").valid("active", "inactive"),
    searchKey : joi.string().allow(""),
    id : joi.string().length(24),
    companyId : joi.string().length(24),
    searchCompany : joi.string().length(24).allow("")
});

exports.createCompanyValidator = joi.object({
    companyName: joi.string().required(),
    dotNumber: joi.string().required(),
    address: joi.string().required(),
    timeZone: joi.string().required().valid('America/Chicago','America/Denver','America/Los_Angeles','Asia/Kuala_Lumpur','America/Bermuda','America/Anchorage','Pacific/Honolulu', 'America/New_York',''),
    terminalAddress: joi.string().required()
});