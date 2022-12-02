require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const SubscriptionModel = require("../Models/SubscriptionModel");
const PlanModel = require("../Models/PlanModel");
const { getSuccessResponse, ApiResponse } = require("../helper/success");
const stripe = require("stripe")(`sk_test_${process.env.STRIPE_KEY}`)
const promise = require("bluebird");
const _ = require("lodash");
const CompanyModel = require("../Models/CompanyModel");
const PaymentMethodModel = require("../Models/PaymentMethodModel");
const initBillingController = () => {

    const getMinPlan = async (req, res) => {
        const { stripeIdQueried } = req.query;
        try {
            if (stripeIdQueried) {
                let getActiveSubscription = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeIdQueried, status: "active" })
                if (getActiveSubscription) {
                    planDetail = await PlanModel.findOne({ stripePriceId: getActiveSubscription.price });
                    const { statusCode, body } = getSuccessResponse(planDetail, null, true);
                    return res.status(statusCode).send(body);
                }
                const standardPlan = await PlanModel.findOne().sort({ vehicleCount: 1 }).limit(1);
                const { statusCode, body } = getSuccessResponse(standardPlan, null, true);

                return res.status(statusCode).send(body);
            }
            const standardPlan = await PlanModel.findOne().sort({ vehicleCount: 1 }).limit(1);
            const { statusCode, body } = getSuccessResponse(standardPlan, null, true);

            return res.status(statusCode).send(body);

        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Something went wrong"))
        }
    }
    const getAllSubscriptions = async (req, res) => {
        const { customerId } = req.body;
        try {
            let invoiceList = await stripe.invoices.list({
                customer: customerId,
            });

            invoiceList = await promise.map(invoiceList.data, async (invoice) => {
                if (invoice && invoice.lines && invoice.lines.data && invoice.lines.data.length) {
                    invoice.quantity = invoice.lines.quantity;
                    let product = await stripe.products.retrieve(invoice.lines.data[0].plan.product);
                    if (product) invoice.product_name = product.name;
                }
                return {
                    number: invoice.number,
                    created: invoice.created,
                    amount_paid: invoice.amount_paid,
                    product_name: invoice.product_name,
                    invoice_pdf: invoice.invoice_pdf,
                    status: invoice.status
                };
            })

            const { statusCode, body } = getSuccessResponse(invoiceList, "Subscriptions fetched successfully!", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    const getNextPlan = async (req, res) => {
        const { price } = req.body;
        try {
            let existingPlan = await PlanModel.findOne({ stripePriceId: price });
            let existignVehicleCount = existingPlan.vehicleCount;
            let nextPlan = await PlanModel.findOne({ "vehicleCount": { $gt: existignVehicleCount } }).sort({ vehicleCount: 1 });
            const { statusCode, body } = getSuccessResponse(nextPlan, "Plan fetched successfully", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    const getAllPaymentMethods = async (req, res) => {
        const {
            type,
            customerId,

        } = req.body;
        try {
            var paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: type
            });
            const customerList = await stripe.customers.list({});
            let defaultPayment
            for (let i = 0; i <= customerList.data.length; i++) {
                if (customerList.data[i] && customerId == customerList.data[i].id) {
                    defaultPayment = customerList.data[i].invoice_settings.default_payment_method
                }
            }
            paymentMethods = _.map(paymentMethods.data, (method) => {
                if (method.id == defaultPayment) {
                    method.defaultPaymentMethod = true;
                }
                else {
                    method.defaultPaymentMethod = false;
                }
                return method;
            })
            if (!paymentMethods) return res.status(403).json(errorFunction(false, "Payment methods not found"));
            const { statusCode, body } = getSuccessResponse(paymentMethods, "Payment Methods fetched successfully", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }

    }
    const updatePaymentMethod = async (req, res) => {
        const { payment_id, isAddDefault, customerId, name, email, companyId, city, line1, line2, postal_code, state } = req.body;
        try {
            var paymentMethodId = payment_id;
            var isAddDefaultPayment = isAddDefault;
            var stripeCustomerId;
            if (customerId) {
                stripeCustomerId = customerId;
            } else {
                stripeCustomerId = await stripe.customers.create({
                    email: email,
                    name: name
                });
                stripeCustomerId = stripeCustomerId.id
            }

            const id = companyId;
            const update = await CompanyModel.updateOne({ _id: id }, { $set: { stripeCustomerId: stripeCustomerId } });
            let savedPaymentMethod = await PaymentMethodModel.findOne({ customerId: stripeCustomerId, paymentMethodId: paymentMethodId })
            let attachedPaymentMethod = null
            if (!savedPaymentMethod) {
                attachedPaymentMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
                savedPaymentMethod = await PaymentMethodModel.create({ paymentMethodId: attachedPaymentMethod.id, customerId: stripeCustomerId })
            }
            let updateMethod;
            if (isAddDefaultPayment) {

                await PaymentMethodModel.updateOne({ _id: savedPaymentMethod._id }, { $set: { defaultPaymentMethod: true } })
                updateMethod = await PaymentMethodModel.findOne({ _id: savedPaymentMethod._id })

            }

            //update payment method
            const customerPayment = await stripe.customers.update(
                stripeCustomerId,
                {
                    invoice_settings: {

                        default_payment_method: isAddDefaultPayment ? paymentMethodId : null

                    },
                }
            )
            let paymentMethods = await stripe.paymentMethods.list({
                customer: stripeCustomerId,
                type: 'card',
            });
            const customerList = await stripe.customers.list({});
            let defaultPayment
            for (let i = 0; i <= customerList.data.length; i++) {
                if (customerList.data[i] && customerId == customerList.data[i].id) {
                    defaultPayment = customerList.data[i].invoice_settings.default_payment_method
                }
            }
            paymentMethods = _.map(paymentMethods.data, (method) => {
                if (method.id == defaultPayment) {
                    method.defaultPaymentMethod = true;
                }
                else {
                    method.defaultPaymentMethod = false;
                }
                return method;
            })

            const paymentMethod = await stripe.paymentMethods.update(
                paymentMethodId,
                {
                    billing_details: {
                        address: {
                            city: city,
                            line1: line1,
                            line2: line2,
                            postal_code: postal_code,
                            state: state
                        },
                        name: name,
                        email: email

                    }

                },
            );
            paymentMethod.defaultPaymentMethod = true;
            paymentMethods = paymentMethods.map(function (item) { return item.id == paymentMethod.id ? paymentMethod : item; });


            let response = {
                paymentMethods: paymentMethods,
                customerPayment: customerPayment,
                paymentMethod: paymentMethod
            }
            const { statusCode, body } = getSuccessResponse(response, "Payment Method updated Successfully", true);
            return res.status(statusCode).send(body);

        }

        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not update Payment method"))
        }

    }
    const deletePaymentMethod = async (req, res) => {
        const { paymentMethodId } = req.body
        try {
            const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
            if (!paymentMethod) return res.status(404).json(errorFunction(false, "Not found!"))
            const { statusCode, body } = getSuccessResponse({}, "Deleted Successfully", true);
            return res.status(statusCode).send(body)
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not delete!"))
        }
    }
    const upgradeSubscriptionPlan = async (req, res) => {
        const { priceId, customerId, paymentMethodId, subscriptionId, quantity, companyId, updateQuantity } = req.body;
        try {

            const attachedPaymentMethod = await stripe.paymentMethods.attach(
                paymentMethodId,
                { customer: customerId }
            );

            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [
                    {
                        price: priceId,
                        quantity: quantity,
                    },
                ],
                default_payment_method: paymentMethodId
            });

            const product = await stripe.products.retrieve(
                subscription.plan.product
            );
            const filter = { stripeSubscriptionId: subscriptionId };
            const update = { status: 'cancel' };

            let updatedStatus = await SubscriptionModel.findOneAndUpdate(filter, update);

            // const deleted = await stripe.subscriptions.del(
            //   subscriptionId
            // );


            let subscriptionObj = new SubscriptionModel({
                stripeSubscriptionId: subscription.id,
                companyId: companyId,
                planId: subscription.plan.product,
                price: priceId,
                vehicleCount: subscription.quantity + parseInt(updateQuantity),
                paymentType: 'card',
                customerId: customerId,
                paymentMethodId: subscription.default_payment_method,
                status: 'active',
                date: new Date()
            });

            let createPlan = await subscriptionObj.save()
            subscription.actualQuantity = createPlan.vehicleCount

            const { statusCode, body } = getSuccessResponse(subscription, "Plan Upgraded Successfully", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Plan not upgraded"))
        }
    }
    const updateSubscriptionPlan = async (req, res) => {

        const inputData = req.body;

        try {
            let { priceId, customerId, paymentMethodId, companyId, subscriptionId, updatedquantity, quantity } = inputData;
            var subscription;
            var subscriptionCreate;
            if (!subscriptionId) {
                const attachedPaymentMethod = await stripe.paymentMethods.attach(
                    paymentMethodId,
                    { customer: customerId }
                );
                subscription = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [
                        {
                            price: priceId,
                            quantity: updatedquantity,
                        },
                    ],
                    default_payment_method: paymentMethodId
                });
            }
            else {
                const deleted = await stripe.subscriptions.del(subscriptionId);
                // console.log(deleted , "deletedddddddddd")
                await SubscriptionModel.updateOne({ companyId: companyId, stripeSubscriptionId: subscriptionId }, { $set: { status: "cancel" } })
                // if (deleted) {

                subscriptionCreate = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [
                        {
                            price: priceId,
                            quantity: updatedquantity,
                        },
                    ],
                    default_payment_method: paymentMethodId
                });
                subscriptionId = subscriptionCreate.id;
                const subscriptionItems = await stripe.subscriptionItems.list({
                    subscription: subscriptionId,
                });
                //  console.log(subscriptionItems.data[0].id ,"3566")
                let itemId;
                for (let i = 0; i < subscriptionItems.data.length; i++) {
                    if (subscriptionItems.data[i].plan.id === priceId) {
                        itemId = subscriptionItems.data[i].id
                    }
                }
                //  console.log(itemId ,"3633")
                subscription = await stripe.subscriptions.update(
                    subscriptionId,
                    {
                        items: [
                            {
                                id: itemId,
                                quantity: updatedquantity + quantity,
                            }],
                        proration_behavior: 'none',
                    },
                );
            }
            let subscriptionObj = new SubscriptionModel({
                stripeSubscriptionId: subscriptionCreate ? subscriptionCreate.id : subscription.id,
                companyId: companyId,
                planId: subscription.plan.product,
                price: priceId,
                vehicleCount: subscriptionCreate ? subscriptionCreate.quantity + parseInt(quantity) : subscription.quantity + parseInt(quantity),
                paymentType: 'card',
                customerId: customerId,
                paymentMethodId: subscription.default_payment_method,
                status: 'active',
                date: new Date()
            });
            console.log("subscriptionObjsubscriptionObj", subscriptionObj);
            let createPlan = await subscriptionObj.save()
            console.log(createPlan, "3944444")
            subscription.actualQuantity = createPlan.vehicleCount

            return res.status(200).json(ApiResponse(subscriptionObj, "plan updated success", true));
        }
        catch (error) {
            console.error(error);
            return res.status(500).json(ApiResponse(null, "Something went wrong!", false))
        }
    }
    const cancelSubscription = async (req, res) => {
        const inputData = req.body;
        try {
            await stripe.subscriptions.del(
                inputData.subscriptionId
            );
            const resultUpdated = await SubscriptionModel.findOneAndUpdate({ stripeSubscriptionId: inputData.subscriptionId }, { $set: { status: 'cancel' } });
            if (!resultUpdated) return res.status(403).json(ApiResponse({}, "Could not cancel subscription", false))
            return res.status(200).json(ApiResponse(resultUpdated, "Subscription Cancelled Successfully", true));
        }
        catch (error) {
            console.error(error);
            return res.status(500).json(ApiResponse({}, "Something went wrong!", false))
        }
    }
    const updateDefaultPaymentMethods = async (req, res) => {
        const inputData = req.body;
        try {
            let updateDefaultMethod = await PaymentMethodModel.findOne({ paymentMethodId: inputData.paymentMethodId, customerId: inputData.customerId });
            if (!updateDefaultMethod) return res.status(403).json(ApiResponse({}, "Default method not updated", false))
            updateDefaultMethod.defaultPaymentMethod = true
            return res.status(200).json(ApiResponse(updateDefaultMethod, "Method updated Successfully!", true));
        }
        catch (error) {
            console.error(error);
            return res.status(200).json(ApiResponse({}, "Something went wrong!", false));
        }
    }
    return {
        getMinPlan,
        getAllSubscriptions,
        getNextPlan,
        getAllPaymentMethods,
        updatePaymentMethod,
        deletePaymentMethod,
        upgradeSubscriptionPlan,
        updateSubscriptionPlan,
        cancelSubscription,
        updateDefaultPaymentMethods
    }
}

module.exports = initBillingController;