require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const ELDModel = require("../Models/ELDModel");
const VehicleModel = require("../Models/VehicleModel")
const limit = process.env.WEB_LIMIT
let skip = 0;
const initEldController = () => {
    const getEldMasterList = async (req, res) => {
        try {
            const { companyId } = req.query;
            const findQuery = {
                isDeleted: false,
                companyId: companyId
            }
            const eldList = await ELDModel.find(findQuery).select({ "serialNumber": 1, "macAddress": 1 });
            let list = []
            if (eldList.length > 0) {
                eldList.map(row => {
                    list.push({
                        id: row._id,
                        displayId: row.displayId,
                        serialNumber: row.serialNumber,
                        macAddress: row.macAddress
                    })
                })
            }
            const { statusCode, body } = getSuccessResponse({ "elds": list }, "ELD fetched successfully", true);
            res.status(statusCode).send(body);

        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not get ELD Master List"))
        }
    }
    const getAllELDS = async (req, res) => {
        const { companyId, page, searchStatus, searchKey } = req.query;
        try {
            let findCond = {
                isDeleted: false,
                companyId: companyId
            }
            if (searchStatus) {
                findCond.isActive = (searchStatus == 'active') ? true : false
            }
            if (searchKey) {
                findCond.$or = [
                    { serialNumber: { '$regex': searchKey, '$options': 'i' } },
                    { macAddress: { '$regex': searchKey, '$options': 'i' } }
                ]
            }
            const total = await ELDModel.countDocuments(findCond);

            if (total == 0) {
                const { statusCode, body } = getSuccessResponse({ elds: [] }, "No record found", false)
                return res.status(statusCode).send(body);
            }
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            let ELDList = await ELDModel.find(findCond)
                .populate({
                    path: 'vehicleId',
                    select: { "vehicleNumber": 1, "vin": 1 }
                })
                .select({
                    "displayId": 1,
                    "vehicleId": 1,
                    "serialNumber": 1,
                    "macAddress": 1,
                    "eldModel": 1,
                    "fwVersion": 1,
                    "bleVersion": 1,
                    "isActive": 1
                }).limit(limit).skip(skip).sort({ createdAt: -1 })

            var count = ELDList.length
            let list = [];
            if (ELDList.length > 0) {
                ELDList.map(row => {
                    list.push({
                        id: row._id,
                        displayId: row.displayId,
                        serialNumber: row.serialNumber,
                        macAddress: row.macAddress,
                        eldModel: row.eldModel,
                        fwVersion: row.fwVersion,
                        bleVersion: row.bleVersion,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : '',
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : '',
                        vin: (row.vehicleId) ? row.vehicleId.vin : '',
                        active: row.isActive
                    })
                })
            }

            var resultData = {
                "elds": list,
                "totalPages": Math.ceil(total / limit),
                "count": count,
                "totalRecord": total
            };

            const { statusCode, body } = getSuccessResponse(resultData, "ELD fetched successfully", true);
            res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "ELD details could not be fetched"))
        }
    }
    const createELD = async (req, res) => {
        const { id: requestorId, companyId } = req.query;
        const { id: eldId, macAddress, serialNumber, eldModel, vehicleId, fwVersion } = req.body;
        try {
            let findCond = { isDeleted: false, companyId: companyId }
            findCond.$or = [
                { serialNumber: serialNumber },
                { macAddress: macAddress }
            ]
            if (eldId) findCond._id = { $ne: eldId }
            let existingRecord = await ELDModel.findOne(findCond);
            if (existingRecord) {
                // if updating request is coming from client
                let eldObj = await ELDModel.findOne({ _id: eldId, companyId: companyId })
                if (!eldObj) return res.status(404).json(errorFunction(false, "Not Found!"));

                let updELDObj = {}
                updELDObj.serialNumber = serialNumber
                updELDObj.macAddress = macAddress,
                    updELDObj.eldModel = eldModel,
                    updELDObj.fwVersion = fwVersion,
                    updELDObj.updatedBy = requestorId
                updELDObj.updatedAt = new Date()
                if (vehicleId) {
                    updELDObj.vehicleId = vehicleId
                }
                if (vehicleId == "") {
                    updELDObj.vehicleId = null;
                }
                const updatedObj = await ELDModel.updateOne({ _id: eldId }, updELDObj);

                if (updatedObj.modifiedCount > 0) {
                    let recordInfo = await ELDModel.findById(id)
                    let eldDetail = {
                        id: recordInfo._id,
                        serialNumber: recordInfo.serialNumber,
                        macAddress: recordInfo.macAddress,
                        eldModel: recordInfo.eldModel,
                        fwVersion: recordInfo.fwVersion,
                        bleVersion: recordInfo.bleVersion,
                        isActive: recordInfo.isActive
                    }
                    const { statusCode, body } = getSuccessResponse({ eld_info: eldDetail }, "ELD information updated successfully", true);
                    return res.status(statusCode).send(body);
                }
            } else {
                // this is where we will create new eld
                var recordObj = {}
                recordObj = {
                    createdBy: requestorId,
                    updatedBy: requestorId,
                    companyId,
                    macAddress,
                    serialNumber,
                    eldModel
                }
                if (vehicleId) {
                    recordObj.vehicleId = vehicleId
                }
                let createdEldObj = await ELDModel.create(recordObj);

                let eldInfo = {
                    id: createdEldObj._id,
                    serialNumber: createdEldObj.serialNumber,
                    macAddress: createdEldObj.macAddress,
                    eldModel: createdEldObj.eldModel,
                    fwVersion: createdEldObj.fwVersion,
                    bleVersion: createdEldObj.bleVersion,
                    isActive: createdEldObj.isActive
                }
                const { statusCode, body } = getSuccessResponse({ eld_info: eldInfo }, "ELD information added successfully", true);
                return res.status(statusCode).send(body);
            }
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not create ELD"));
        }
    }
    const getEldDetail = async (req, res) => {
        const { id: askedId } = req.params;
        try {
            const recordDetail = await ELDModel.findOne({ _id: askedId, isDeleted: false }).populate({
                path: 'vehicleId',
                select: { "vehicleNumber": 1, "vin": 1 }
            });
            let detail = {
                id: recordDetail._id,
                displayId: recordDetail.displayId,
                serialNumber: recordDetail.serialNumber,
                macAddress: recordDetail.macAddress,
                eldModel: recordDetail.eldModel,
                fwVersion: recordDetail.fwVersion,
                bleVersion: recordDetail.bleVersion,
                vehicleId: (recordDetail.vehicleId) ? recordDetail.vehicleId._id : '',
                vehicleNumber: (recordDetail.vehicleId) ? recordDetail.vehicleId.vehicleNumber : '',
                vin: (recordDetail.vehicleId) ? recordDetail.vehicleId.vin : '',
                active: recordDetail.isActive
            }
            const { statusCode, body } = getSuccessResponse({ detail }, "ELD information", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "ELD Does not exists"));
        }
    }
    const deactivate = async (req, res) => {
        const { id: requestorId, companyId } = req.query;
        const { id, status } = req.body;
        try {
            let ELDInfo = await ELDModel.findOne({ companyId: companyId, _id: id, isDeleted: false });
            if (!ELDInfo) return res.status(404).json(errorFunction(false, "Not Found!"))
            const updateObj = {
                updatedBy: requestorId,
                updatedAt: new Date()
            }
            status == 'inactive' ? updateObj.isActive = false : updateObj.isActive = true;
            const updatedELD = await ELDModel.updateOne({ _id: id }, updateObj);
            if (!updatedELD) return res.status(403).json(errorfunction(false, "Could not update status"))
            const { statusCode, body } = getSuccessResponse({}, updatedELD.isActive ? "Activated" : "Deactivated", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not update Status"));
        }
    }
    const deleteELD = async (req, res) => {
        const { id: requestorId } = req.query;
        const { id: askedId } = req.body;
        try {
            let deleteQuery = {
                isDeleted: true,
                updatedBy: requestorId,
                updatedAt: new Date()
            }
            const result = await ELDModel.findOneAndUpdate({ _id: askedId }, { $set: deleteQuery }, { new: true });
            if( !result) return res.status(403).json(errorFunction(false, "Could not delete"));
            const vehicleStat = await VehicleModel.findOneAndUpdate({ eldId:askedId }, {$set:{eldId:null,updatedBy:requestorId, updatedAt:new Date()}}, {new: true});
            // if(!vehicleStat) return res.status(403).json(errorFunction(false, "Could not update Status"));
            const {statusCode, body} = getSuccessResponse(result,"ELD deleted successfully",true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not delete"));
        }
    }
    const unassignEld = async (req, res) => {
        const {vehicleId} = req.body;
        try{
            const unassignELD = await VehicleModel.updateOne({_id : vehicleId}, {$unset : {eldId : 1}} );
            if(!unassignELD)
             return res.status(403).json(errorFunction(false, "ELD Could not be unassigned"))
            const {statusCode , body} = getSuccessResponse({}, "ELD unassigned Successfully", true)
            return res.status(statusCode).send(body)
        }catch(err) 
        {
            console.error(err);
            res.status(500).json(errorFunction(false, "ELD Could not be unassigned"))
        }
    }
    return {
        getEldMasterList,
        getAllELDS,
        createELD,
        getEldDetail,
        deactivate,
        deleteELD,
        unassignEld
    };
}

module.exports = initEldController;