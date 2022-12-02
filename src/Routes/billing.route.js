const {Router} = require("express");
const initBillingController = require("../controllers/billing.controller");
const { getAllSubscriptionsValidator, getNextPlanValidator, getAllPaymentMethodsBodyValidator, updatePaymentMethodValidator, deleteCardValidator, upgradePlanValidator, updateSubscriptionValidator, cancelSubscriptionValidator, defaultPaymentMethodsValidator } = require("../joiValidators/billing.validator");
const router = Router();
const {tokenVerification, addCustomQueryHeaders, customValidation} = require("../Middlewares/validation");
const billingRouter = () => {
    const {getMinPlan, getAllSubscriptions,getNextPlan,updatePaymentMethod, getAllPaymentMethods, deletePaymentMethod, upgradeSubscriptionPlan, updateSubscriptionPlan, cancelSubscription, updateDefaultPaymentMethods} = initBillingController()
    router.route("/getMinPlan").get([tokenVerification(), addCustomQueryHeaders("companyInfo.stripeCustomerId", "stripeIdQueried")], getMinPlan)
    router.route("/getAllSubscription").post([customValidation(getAllSubscriptionsValidator, "body"), tokenVerification()], getAllSubscriptions)
    router.route("/getNextPlan").post([customValidation(getNextPlanValidator, "body"), tokenVerification()], getNextPlan)
 

    router.route("/getAllPaymentMethods").post([customValidation(getAllPaymentMethodsBodyValidator, "body"), tokenVerification()], getAllPaymentMethods)
    router.route("/updatePaymentMethod").post([customValidation(updatePaymentMethodValidator, "body"), tokenVerification()], updatePaymentMethod)
    router.route("/deletePaymentMethod").post([customValidation(deleteCardValidator, "body"), tokenVerification()], deletePaymentMethod)
    // subscription plan
    router.route("/upgrade").post([customValidation(upgradePlanValidator, "body") , tokenVerification()], upgradeSubscriptionPlan)
    router.route("/updatePlan").post([customValidation(updateSubscriptionValidator, "body"), tokenVerification()], updateSubscriptionPlan);
    router.route("/cancelSubscription").post([customValidation (cancelSubscriptionValidator, "body"), tokenVerification()], cancelSubscription)
    router.route("/defaultPaymentMethods").post([customValidation(defaultPaymentMethodsValidator, "body"), tokenVerification()], updateDefaultPaymentMethods)


    return router;

}

module.exports = billingRouter;