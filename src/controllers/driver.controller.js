require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const UserModel = require("../Models/UserModel");
const DriversModel = require("../Models/DriverModel");
const constant = require("../helper/constants");
const jwt_decode = require("jwt-decode");
const { getSuccessResponse } = require("../helper/success");
const createQuery = require("../helper/createQuery");
const { hashPassword } = require("../helper/utils");
const LatestDriverStatusModel = require('../Models/LatestVehicleStatusModel')
const limit = process.env.WEB_LIMIT;
let skip = 0;
const initDriverController = () => {
    const createDriver = async (req, res) => {
        const { updateDriverModel, createNewTuple, createStatusObjectAfterNewDriver, createLatestDriverStatus, updateDriverDailyLogs } = createQuery();
        const { id, companyId } = req.query;
        const payload = req.body;
        if (payload && payload.password) {
            const hashedPassword = await hashPassword(payload.password);
            payload.password = hashedPassword;
            delete payload.confirmPassword;
        }
        try {
            const loggedInUser = await UserModel.findById(id);
            const checkIfDriverExists = await DriversModel.findOne({ userName: payload.userName });
            console.log(payload);
            // if the user has to be updated
            if (payload.id) {
                // updating driver model from createQuery function
                const updatedModelResponse = updateDriverModel(payload, loggedInUser);
                if (!updatedModelResponse) return res.send(403).json(errorFunction(false, "Unable to update Driver Details"))
                const { statusCode, body } = getSuccessResponse(updatedModelResponse, "Driver Information updated", true);
                res.status(statusCode).send(body);
            }
            // if new user has to be created
            else {
                if (payload.assignedVehicleId === "") delete payload.assignedVehicleId;
                const createNewDriver = await createNewTuple(payload, loggedInUser, companyId, DriversModel);
                if (!createNewDriver) return res.status(403).json(errorFunction(false, "Could not create Driver!"))
                const statusObject = createStatusObjectAfterNewDriver(payload, createNewDriver, companyId);
                await createLatestDriverStatus(statusObject); // output would be true or false
                // updating daily logs after creating the status object
                const updatedDailyDriverlogs = await updateDriverDailyLogs(createNewDriver, companyId);
                if (updatedDailyDriverlogs) {
                    const { statusCode, body } = getSuccessResponse({ driverInfo: createNewDriver }, "Driver added Successfully", true);
                    res.status(statusCode).send(body);
                } else {
                    res.status(424).json({ success: false, message: "Could not create Driver" });
                }
            }
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not create Driver"))
        }
    }
    const getAllDrivers = async (req, res) => {
        const { id, searchKey, page, searchStatus } = req.query;
        const { companyId } = req.query;
        let pageLocal = 0;
        try {
            let findAllDriversQuery = {
                isDeleted: false,
                companyId: companyId
            }
            pageLocal = page ? page : pageLocal;
            if (searchStatus) findAllDriversQuery.isActive = searchStatus == "active" ? true : false;
            if (searchKey) {
                findAllDriversQuery['$expr'] = {
                    "$regexMatch": {
                        "input": { "$concat": ["$firstName", " ", "$lastName"] },
                        "regex": searchKey.trim(),  //Your text search here
                        "options": "i"
                    }
                }
            }
            const total = await DriversModel.countDocuments(findAllDriversQuery);

            if (total == 0) return res.status(200).json(getSuccessResponse({ users: [] }, "No record found", false));
            if (pageLocal && (pageLocal > 0)) {
                skip = (parseInt(page) - 1) * limit
            }

            let driverList = await DriversModel.find(findAllDriversQuery)
                .populate({
                path:'assignedVehicleId',
                select:{"licenseNumber":1}
                })
                .select({
                    "firstName": 1,
                    "lastName": 1,
                    "userName": 1,
                    "phoneNumber": 1,
                    "email": 1,
                    "cycle": 1,
                    "os": 1,
                    "appVersion": 1,
                    "assignedVehicleId": 1,
                    "isActive": 1,
                    "licenseNumber": 1
                }).limit(limit).skip(skip).sort({ createdAt: -1 });

            var count = driverList.length;
            const driverListToSend = [];
            if (count > 0) {
                driverList.map(row => {
                    driverListToSend.push({
                        id: row.id,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        userName: row.userName,
                        phoneNumber: row.phoneNumber,
                        email: row.email,
                        cycle: row.cycle,
                        os: row.os,
                        appVersion: row.appVersion,
                        vehicleNo: row.licenseNumber,
                        active: row.isActive
                    })
                })
            }
            const resultData = {
                "drivers": driverListToSend,
                "totalPages": Math.ceil(total / limit),
                "count": count,
                "totalRecord": total
            };

            const { statusCode, body } = getSuccessResponse(resultData, "Drivers Fetched Successfully", true);
            res.status(statusCode).send(body)
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not get Driver Details"))
        }
    }
    const getDriver = async (req, res) => {
        const { companyId } = req.query;
        const { id: askedId } = req.params;
        try {
            const findCondition = {
                isDeleted: false,
                _id: askedId,
                companyId: companyId
            }
            const foundUser = await DriversModel.findOne(findCondition);
            if (!foundUser) return res.status(404).json(errorFunction(false, "Could not find user"));
            delete foundUser.password;
            foundUser.vehicleNo = (foundUser.assignedVehicleId) ? foundUser.assignedVehicleId.vehicleNumber : "";
            foundUser.vehicleId = (foundUser.assignedVehicleId) ? foundUser.assignedVehicleId._id : "";
            const { statusCode, body } = getSuccessResponse(foundUser, "Driver fetched successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            res.status(500).json(errorFunction(false, "Could not get Driver Details"))
        }
    }
    const deactivateDriver = async (req, res) => {
        const { id: askedId, status: askedStatus } = req.body;
        try {
            const deactivateQuery = {
                isDeleted: false,
                isActive: askedStatus === "inactive" ? false : true
            }
            const askedDriver = await DriversModel.findByIdAndUpdate(askedId, { $set: deactivateQuery });
            if (!askedDriver) return res.status(404).json(errorFunction(false, "Driver not found"));
            const updateLogs = await LatestDriverStatusModel.updateOne({ driverId: askedId }, { isActive: deactivateQuery.isActive })
            if (!updateLogs) return res.status(403).json(errorFunction(false, "Driver could not be updated"));
            const { statusCode, body } = getSuccessResponse({}, "Driver updated Successfully", true);
            return res.status(statusCode).send(body);

        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not update driver"));
        }
    }
    return {
        createDriver,
        getAllDrivers,
        getDriver,
        deactivateDriver
    }

}

module.exports = initDriverController;