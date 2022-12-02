const joi = require("joi");

exports.createPortalUserValidator = joi.object({
    firstName : joi.string().required(),
    lastName : joi.string().required(),
    email : joi.string().email().trim(true).required(),
    phoneNumber: joi.string().required(),
    password : joi.string().min(8).max(14).trim(true).required(),
    confirmPassword : joi.string().required().valid(joi.ref('password')),
    role : joi.string().valid("company-administrator", "company-portal-user", "company-fleet-manager").required()
})

exports.idValidatorForParams = joi.object({
    id : joi.string().length(24).required()
})