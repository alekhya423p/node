require("dotenv").config();
const createQuery = require("../helper/createQuery");
const errorFunction = require("../helper/errorFunction");
const VehicleStatusModel = require("../Models/LatestVehicleStatusModel");
const { getSuccessResponse, ApiResponse } = require("../helper/success");
var skip = 0;
var limit = parseInt(process.env.WEB_LIMIT);
const mongoose = require("mongoose");
const initAssetsController = () => {
    const getAllAssets = async (req, res) => {
        const { getAllAssetsQueryAggregator } = createQuery();
        const { id, companyId, searchKey, page } = req.query;
        try {

            let findCond = { isDeleted: false, companyId: new mongoose.Types.ObjectId(companyId) }
            if (searchKey) {
                var searchKeyText = new RegExp(searchKey, 'i');
                findCond['$or'] = [{ vehicleNumber: searchKeyText }, { vin: searchKeyText }];
            }
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            const assetList = await getAllAssetsQueryAggregator(findCond, skip > 0 ? skip : 0);
            if (!assetList.length) {
                const { statusCode, body } = getSuccessResponse({ assets: [] }, "No Records found!", false);
                return res.status(statusCode).send(body);
            }
            // in the case records are there
            const count = assetList.length
            let list = []
            if (assetList.length > 0) {
                assetList.map(row => {
                    list.push({
                        vehicleId: row._id,
                        vehicle: row.vehicleNumber,
                        vin: row.vin,
                        driver: (row.asset_info) ? row.asset_info.firstName + " " + row.asset_info.lastName : "",
                        location_lat: (row.asset_location) ? row.asset_location.lat : "",
                        location_lng: (row.asset_location) ? row.asset_location.lng : "",
                        location: (row.asset_location) ? row.asset_location.location : "",
                        eldsn: (row.eld_values) ? row.eld_values.serialNumber + "(" + row.eld_values.macAddress + ")" : ""
                    })
                })
            }
            var resultData = {
                "assets": list,
                "totalPages": Math.ceil(count / limit),
                "count": count,
                "totalRecord": count
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Assets fetched successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Assets not found"))
        }
    }
    const getAssetDetails = async (req, res) => {
        const { id: vehicleId } = req.params
        try {
            let vehicleInfo = await VehicleStatusModel.scan().where("vehicleId").eq(vehicleId).exec();
            if (vehicleInfo.count) return res.status(200).json(ApiResponse(vehicleInfo, "Asset fetched successfully", true));
            return res.status(403).json(ApiResponse({}, "Unable to fetch asset", false));

        } catch (error) {
            console.error(error);
            return res.status(500).json(ApiResponse({}, "Something went wrong", false));
        }
    }
    return {
        getAllAssets, getAssetDetails
    }
}

module.exports = initAssetsController;