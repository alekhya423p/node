const joi = require("joi");

exports.fmcsaGetValidator = joi.object({
    id: joi.string().length(24),
    companyId : joi.string().length(24),
    searchKey : joi.string().allow(""),
    searchDate : joi.string().allow("")
})