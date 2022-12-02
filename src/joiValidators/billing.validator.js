const joi = require("joi");

exports.getAllSubscriptionsValidator = joi.object({
    customerId: joi.string().required()
})
exports.getNextPlanValidator = joi.object({
    price: joi.string().required()
})

exports.getAllPaymentMethodsBodyValidator = joi.object({
    customerId: joi.string().required(),
    type: joi.string().required()
})

exports.updatePaymentMethodValidator = joi.object({
    email: joi.string().email().trim(true).required(),
    name: joi.string().required(),
    line1: joi.string().required(),
    line2: joi.string().allow(""),
    state: joi.string().required(),
    city: joi.string().required(),
    postal_code: joi.string().required(),
    isAddDefault: joi.boolean().required(),
    isCard: joi.boolean().required(),
    isBank: joi.boolean().required(),
    payment_id: joi.string().required(),
    customerId: joi.string().required(),
    companyId: joi.string().length(24).required(),
    userId: joi.string().length(24).required(),
    email_address: joi.string().allow(""),
})

exports.deleteCardValidator = joi.object({
    paymentMethodId: joi.string().required()
})


exports.upgradePlanValidator = joi.object({
    priceId: joi.string().required(),
    customerId: joi.string().required(),
    paymentMethodId: joi.string().required(),
    subscriptionId: joi.string().required(),
    quantity: joi.number().required(),
    updateQuantity: joi.number().required(),
    companyId: joi.string().length(24).required(),
})

exports.updateSubscriptionValidator = joi.object({
    priceId : joi.string().required(),
    customerId : joi.string().required(),
    paymentMethodId : joi.string().required(),
    companyId : joi.string().required(),
    subscriptionId : joi.string().required(),
    updatedquantity : joi.string().required(), 
    quantity : joi.string().required(),
})

exports.cancelSubscriptionValidator = joi.object({
    subscriptionId : joi.string().required(),
})


exports.defaultPaymentMethodsValidator = joi.object({
    customerId : joi.string().required(),
    paymentMethodId : joi.string().required()
})