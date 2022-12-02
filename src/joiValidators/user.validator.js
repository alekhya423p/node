const joi = require("joi");

exports.loginValidator = joi.object({
    email: joi.string().email().trim(true).required(),
    password: joi.string().min(8).max(14).trim(true).required(),
    rememberMe: joi.boolean(),
})

exports.registerValidator = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().email().trim(true).required(),
    companyName: joi.string().required(),
    dotNumber: joi.string().length(8).pattern(/^[0-9]+$/).required(),
    timeZone: joi.string().required(),
    // phoneNumber : joi.string().length(10).pattern(/^[0-9]+$/).required(),
    phoneNumber: joi.string().required(),
    password: joi.string().min(8).max(14).trim(true).required(),
    confirmPassword: joi.string().required().valid(joi.ref('password')),
    policy: joi.boolean().invalid(false).required()
})

exports.verifyUserMailValidator = joi.object({
    id: joi.string().length(24).required(),
    token: joi.string().length(50).required()
})

exports.changePasswordValidator = joi.object({
    oldPassword: joi.string().min(8).max(14).trim(true).required().label("Old Password"),
    newPassword: joi.string().disallow(joi.ref('oldPassword')).min(8).max(14).trim(true).required().label("New Password")
        .options({
            messages: {
                'any.only': '{{#label}} should not be same'
            }
        })

})

exports.generalEmail = joi.object({
    email: joi.string().email().trim(true).required(),
})

exports.updateUserValidator = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    phoneNumber: joi.string().required(),
    landingPage: joi.string().valid("/logs", "/dashboard", "/driver-hos").required(),
    companyId: joi.string().length(24).required(),
    _id: joi.string().length(24).required(),

})