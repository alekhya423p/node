const Joi = require("joi");
const alphaCharRegex = /^[a-zA-Z]{2,}$$/;

exports.createDriverValidator = Joi.object().keys({
    firstName: Joi.string().regex(alphaCharRegex).min(2).max(30).required(),
    lastName: Joi.string().regex(alphaCharRegex).min(2).max(30).required(),
    email: Joi.string().allow(""),
    userName: Joi.string().min(4).max(60).required(),
    licenseNumber: Joi.string().min(1).max(20).required(),
    licenseState: Joi.string().min(2).max(2).required(),
    id:Joi.string(),
    password: Joi.string().allow(""),
    confirmPassword: Joi.string().allow(""),
    cycle: Joi.string().allow(""),
    restartHours: Joi.string().valid('', '34H', '24H'),
    phoneNumber: Joi.string().allow(''),
    restBreak: Joi.string().allow(''),
    cargoType: Joi.string().valid('', 'PROPERTY', 'PASSENGER'),
    assignedVehicleId: Joi.string().allow(""),
    companyId: Joi.string().required(),
    homeTerminal: Joi.string().allow(''),
    isEditble: Joi.boolean().allow(''),
    manualDriveAllowed: Joi.boolean().allow(''),
    pcAllowed: Joi.boolean().allow(''),
    phoneNumber: Joi.string().allow(''),
    shortHaulAllowed: Joi.boolean().allow(''),
    splitSBAllowed: Joi.boolean().allow(''),
    ymAllowed: Joi.boolean().allow(''),
});

exports.deleteDriverValidator = Joi.object({
    id : Joi.string().length(24).required(),
    status : Joi.string().valid("inactive", "active").required()
})