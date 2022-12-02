const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const VehicleModel = require("../Models/VehicleModel");
const SubscriptionModel = require("../Models/SubscriptionModel");
const UserModel = require("../Models/UserModel");
const constants = require("../helper/constants");
const createQuery = require("../helper/createQuery");
const LatestVehicleStatus = require("../Models/LatestVehicleStatusModel");
const fieldsCalculation = require("../helper/outputCsvHelpers/fieldsCalculation");
let skip = 0;

const LIMIT = 20;
const initVehicleController = () => {
    const getMasterVehicleList = async (req, res) => {
        try {
            const { companyId } = req.query;
            const findCondition = {
                isDeleted: false,
                companyId: companyId
            }
            const foundVehicle = await VehicleModel.find(findCondition)
                .select({ "vehicleNumber": 1, "vin": 1 }).sort({ vehicleNumber: 1 });
            if (!foundVehicle) return res.status(404).json(errorFunction(false, "Could not find Vehicle"))
            const { statusCode, body } = getSuccessResponse({ "vehicles": foundVehicle }, "Vehicles Fetched Successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not find Vehicle"));
        }
    }
    const getAllVehicle = async (req, res) => {
        const { id, searchKey, searchStatus, page, companyId } = req.query;
        let pageLocal = 0;
        try {
            let findCondition = {
                isDeleted: false,
                companyId: companyId
            };
            pageLocal = page ? page : pageLocal;
            if (searchStatus) {
                findCondition.isActive = searchStatus == "active" ? true : false;
            }
            if (searchKey) {
                findCondition.$or = [
                    { vehicleNumber: { '$regex': searchKey, '$options': 'i' } },
                    { vin: { '$regex': searchKey, '$options': 'i' } }
                ]
            }
            const totalDocuments = await VehicleModel.countDocuments(findCondition);

            if (totalDocuments == 0) return res.status(200).json(getSuccessResponse({ users: [] }, "No record found", false));

            if (pageLocal && (pageLocal > 0)) {
                skip = (parseInt(page) - 1) * LIMIT
            }

            let vehicleList = await VehicleModel.find(findCondition)
                .select({
                    "displayId": 1,
                    "eldId": 1,
                    "vehicleNumber": 1,
                    "plateNumber": 1,
                    "vin": 1,
                    "vehicleMaker": 1,
                    "vehicleModel": 1,
                    "year": 1,
                    "isActive": 1
                }).limit(LIMIT).skip(skip).sort({ createdAt: -1 })
            var count = vehicleList.length
            let list = [];
            if (vehicleList.length > 0) {
                vehicleList.map(row => {
                    list.push({
                        id: row.id,
                        displayId: row.displayId,
                        vehicleNumber: row.vehicleNumber,
                        plateNumber: row.plateNumber,
                        vehicleModel: row.vehicleModel,
                        vin: row.vin,
                        make: row.vehicleMaker,
                        year: row.year,
                        eld: (row.eldId) ? row.eldId._id : '',
                        eldSerialNumber: (row.eldId) ? row.eldId.serialNumber : '',
                        eldMacAddress: (row.eldId) ? row.eldId.macAddress : '',
                        active: row.isActive
                    })
                })
            }
            var resultData = {
                "vehicles": list,
                "totalPages": Math.ceil(totalDocuments / LIMIT),
                "count": count,
                "totalRecord": totalDocuments
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Vehicles Fetched Successfully", true);
            res.status(statusCode).send(body)
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not fetch users"));
        }
    }
    const getActiveVehicleCount = async (req, res) => {
        const { companyId } = req.query;
        try {
            const findQuery = {
                isActive: true,
                companyId: companyId,
                isDeleted: false
            }
            const activeVehicles = await VehicleModel.find(findQuery).countDocuments();
            if (!activeVehicles) return res.status(404).json(errorFunction(false, "could not vehicle count list"));
            const { statusCode, body } = getSuccessResponse({ "vehicles": activeVehicles }, "Vehicles count fetched successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "could not vehicle count list"))
        }
    }
    const getVehicleDetails = async (req, res) => {
        const { id: askedId } = req.params;
        const { id, companyId } = req.query
        try {
            const findCondition = {
                isDeleted: false,
                companyId: companyId,
                _id: askedId
            }
            const recordDetail = await VehicleModel.findOne(findCondition)
                .populate({
                    path: 'eldId',
                    select: { "serialNumber": 1, "macAddress": 1 }
                });
            if (recordDetail) {
                let detail = {
                    id: recordDetail._id,
                    vehicleNumber: recordDetail.vehicleNumber,
                    vehicleModel: recordDetail.vehicleModel,
                    vin: recordDetail.vin,
                    make: recordDetail.vehicleMaker,
                    year: recordDetail.year,
                    plateNumber: recordDetail.plateNumber,
                    plateState: recordDetail.plateState,
                    fuelType: recordDetail.fuelType,
                    eldConnectionInterface: recordDetail.eldConnectionInterface,
                    eld: (recordDetail.eldId) ? recordDetail.eldId._id : '',
                    eldSerialNumber: (recordDetail.eldId) ? recordDetail.eldId.serialNumber : '',
                    eldMacAddress: (recordDetail.eldId) ? recordDetail.eldId.macAddress : '',
                    active: recordDetail.isActive
                }
                const { statusCode, body } = getSuccessResponse(detail, "Vehicle fetched successfully", true);
                return res.status(statusCode).send(body)
            }
            else {
                return res.status(404).json(errorFunction(false, "Vehicle not found"))
            }
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Vehicle Details not found"))
        }
    }
    const editVehicle = async (req, res) => {
        const { id: requestorId, companyId } = req.query;
        const payload = req.body;
        const { createNewTuple, createLatestVehicleStatus, updateExistingVehicle, getSuccessVehicleResponse } = createQuery();
        try {

            const { id, vin, vehicleNumber, eld } = payload;
            let checkVinValidation = fieldsCalculation.calculateVinNumber(vin);
            if (!checkVinValidation) return res.status(403).json(errorFunction(false, "VIN number is not valid"))
            const loggedInUser = await UserModel.findById(requestorId);
            let findCond = { isDeleted: false, companyId: companyId }
            findCond.$or = [
                { vin: vin },
                { vehicleNumber: vehicleNumber }
            ]
            if (id) {
                findCond._id = { $ne: id }
            }
            let existingVehicle = await VehicleModel.findOne(findCond);
            var message = ""
            if (existingVehicle) {
                if (existingVehicle.vehicleNumber == vehicleNumber) {
                    message = "Vehicle number already exist"
                }
                if (existingVehicle.vin == vin) {
                    message = "VIN already exist"
                }
                // here we are updating the vehicle if it is already there
                if (
                    constants.ROLES.COMPANY_ADMINISTRATOR_FOR_ALL_USER.includes(loggedInUser.role) ||
                    constants.ROLES.SYSTEM_ADMINISTRATOR_AND_TECHNICIAN.includes(loggedInUser.role) ||
                    constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN.includes(loggedInUser.role)
                ) {

                    const responseFromVehicleUpdate = await updateExistingVehicle(payload, requestorId);
                    if (!responseFromVehicleUpdate) return res.status(403).json(errorFunction(false, message ? message : "Information could not be updated"));
                    const { statusCode, body } = getSuccessResponse(await getSuccessVehicleResponse(id), "Driver information updated Successfully", true);
                    return res.status(statusCode).send(body);
                } else {
                    return res.status(403).json(errorFunction(false, "User not authorized"))
                }
            }
            const checkSubscription = await SubscriptionModel.findOne({ companyId: companyId }).sort({ date: -1 })
            const countDocs = await VehicleModel.find({ companyId: companyId }).count();
            // checking user authorization 
            if (
                constants.ROLES.COMPANY_ADMINISTRATOR_FOR_ALL_USER.includes(loggedInUser.role) ||
                constants.ROLES.SYSTEM_ADMINISTRATOR_AND_TECHNICIAN.includes(loggedInUser.role) ||
                constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN.includes(loggedInUser.role)
            ) {
                if (checkSubscription && checkSubscription.vehicleCount > countDocs || !checkSubscription && countDocs > 2) return res.status(403).json(errorFunction(false, "Maximum vehicles achieved"));
                if (eld && eld !== "") payload.eld = eld;
                const newVehicle = await createNewTuple(payload, loggedInUser, companyId, VehicleModel);

                if (!newVehicle) return res.status(423).json(errorFunction(false, "Vehicle not created"))
                const { _id } = newVehicle;
                const statusObject = {
                    vehicleId: _id,
                    companyId: companyId
                }
                const newVehicleStatusCreated = await createLatestVehicleStatus(statusObject);
                if (!newVehicleStatusCreated) return res.status(423).json(errorFunction(false, "Vehicle Status not created"))
                const { statusCode, body } = getSuccessResponse({ vehicle_info: newVehicle }, "New Vehicle created", true);
                return res.status(statusCode).send(body)
            } else {
                return res.status(403).json(errorFunction(false, "User not authorized"))
            }

        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Driver not updated"))
        }
    }
    const deactivate = async (req, res) => {
        const { id: askedId, status: askedStatus } = req.body;
        try {
            const deactivateQuery = {
                isDeleted: false,
                isActive: askedStatus === "inactive" ? false : true
            }
            const askedVehicle = await VehicleModel.findByIdAndUpdate(askedId, { $set: deactivateQuery });
            if (!askedVehicle) return res.status(404).json(errorFunction(false, "Vehicle not found"));
            const updateLogs = await LatestVehicleStatus.updateOne({ vehicleId: askedId }, { isActive: deactivateQuery.isActive })
            if (!updateLogs) return res.status(403).json(errorFunction(false, "Driver could not be updated"));
            const { statusCode, body } = getSuccessResponse({}, "Driver updated Successfully", true);
            return res.status(statusCode).send(body);

        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not update Vehicle"));
        }
    }
    return {
        getMasterVehicleList,
        getAllVehicle,
        getActiveVehicleCount,
        getVehicleDetails,
        editVehicle,
        deactivate
    }
}

module.exports = initVehicleController