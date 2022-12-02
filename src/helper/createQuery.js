require("dotenv").config();

const moment = require('moment-timezone');
const _ = require('lodash');
const UserModel = require("../Models/UserModel");
const DriverModel = require("../Models/DriverModel");
const HosRule = require("../Models/HosRuleModel");
const LatestDriverStatus = require("../Models/LatestDriverStatusModel");
const CompanyModel = require("../Models/CompanyModel");
const DailyLogsModel = require("../Models/DailyLogModel")
const HOSEvent = require("../Models/HOSEventsModel");
const LatestVehicleStatus = require("../Models/LatestVehicleStatusModel");
const LocationHistory = require("../Models/VehicleLocationHistoryModel");
const addFieldsQuery = require("./outputCsvHelpers/addFieldsQuery")
var eventCodeArr = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM']
let cycleTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
let breakTimeAccumulatedTimeEnum = ['DS_D'];
const promise = require("bluebird");
let breakTimeAccumulatedRestartTimeEnum = ['DS_ON', 'DS_OFF', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
let shiftTimeViolationTimeEnum = ['DS_ON', 'DS_D', 'DR_IND_YM']
let shiftTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
let cycleTimeAccumulatedTimeEnum = ['DS_ON', 'DS_D', 'DR_IND_YM'];
let shiftTimeAccumulatedTimeEnum = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
let driveTimeAccumulatedTimeEnum = ['DS_D'];
let driveTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
var motionObj = ['PERIODIC', 'TRIP_START', 'TRIP_END'];
var stationaryObj = ['BLE_OFF', 'BLE_ON', 'ENG_OFF', 'ENG_ON'];

const DailyLog = require("../Models/DailyLogModel");
const VehicleModel = require("../Models/VehicleModel");
const VehicleLocation = require("../Models/VehicleLocationHistoryModel");
const { getSuccessResponse } = require("./success");
const { calculteDistance } = require("./utils");
const errorFunction = require("./errorFunction");
const limit = process.env.WEB_LIMIT;
const createQuery = () => {
    function getPortelFindQuery(portelBody, companyId) {
        let query = {
            isDeleted: false,
            companyId: companyId,
            $or: [{ email: portelBody.email }]
        }
        if (portelBody.id) {
            query.$ne = { _id: portelBody.id }
        }
        return query;
    }
    const updateUserModel = async (modellingData, loggedInUser) => {
        modellingData.updatedBy = loggedInUser._id;
        modellingData.updatedAt = new Date();
        const userData = await UserModel.findByIdAndUpdate(modellingData.id, { $set: portelBody }, { new: true })
        if (!userData) return;
        return portelSuccessResponse(userData, "Portal User Information updated successfully")
    }
    const updateDriverModel = async (modellingData, loggedInUser) => {
        modellingData.updatedBy = loggedInUser._id;
        modellingData.updatedAt = new Date();
        const userData = await DriverModel.findByIdAndUpdate(modellingData.id, { $set: modellingData }, { new: true })
        if (!userData) return;
        return portelSuccessResponse(userData, "Driver Information updated successfully")
    }
    const createNewPortal = async (payload, loggedInUser, companyId) => {
        payload.createdBy = loggedInUser._id;
        payload.updatedBy = loggedInUser._id;
        payload.companyId = companyId;
        const createdPortal = await UserModel.create(payload);
        if (!createdPortal) return;
        return createdPortal;
    }
    const createNewTuple = async (payload, loggedInUser, companyId, model) => {
        payload.createdBy = loggedInUser._id;
        payload.updatedBy = loggedInUser._id;
        payload.companyId = companyId;

        const createTuple = await model.create(payload)
        if (!createTuple) return;
        return createTuple;
    }
    const createStatusObjectAfterNewDriver = (payload, newDriver, creatorsCompanyId) => {
        const { _id, cycle, restBreak, cargoType } = newDriver;
        const { assignedVehicleId } = payload;
        const statusObject = {
            companyId: creatorsCompanyId,
            driverId: _id,
            restBreak: restBreak,
            cycle: cycle,
            cargoType: cargoType
        }
        if (assignedVehicleId) statusObject.vehicleId = assignedVehicleId;
        return statusObject;
    }

    //function to create role in latestDriverStatus collection for newly created driver
    async function createLatestDriverStatus(inputData) {
        let driverStatusObj = {
            companyId: inputData.companyId,
            driverId: inputData.driverId,
            currentStatus: 'DS_OFF'
        }
        if (inputData.vehicleId) {
            driverStatusObj.vehicleId = inputData.vehicleId
        }
        //calculate time
        let ruleInfo = await HosRule.findOne({ rule: inputData.cycle })
        let types = ['breakTime', 'driveTime', 'shiftTime', 'cycleTime']

        let times = []
        var regulation = ''
        var limitTime = 0
        var restartTime = 0
        //Switch cases on the basis of entities in types array.
        types.map((type) => {
            switch (type) {
                case 'breakTime':
                    regulation = inputData.restBreak
                    limitTime = (inputData.restBreak == '30M_REST_BREAK') ? 28800 : 0
                    restartTime = 1800
                    break;
                case 'driveTime':
                    regulation = "11H_DRIVE_LIMIT"
                    limitTime = 39600
                    restartTime = 36000
                    break;
                case 'cycleTime':
                    regulation = (inputData.cycle) ? inputData.cycle : "70H_CYCLE_LIMIT"
                    limitTime = inputData.cycle ? ruleInfo.cycleTime * 3600 : 70 * 3600
                    restartTime = 122400
                    break;
                default:
                    regulation = (inputData.cargoType == 'PASSENGER') ? "15H_SHIFT_LIMIT" : "14H_SHIFT_LIMIT"
                    limitTime = (inputData.cargoType == 'PASSENGER') ? 3600 * 15 : 3600 * 14
                    restartTime = (inputData.cargoType == 'PASSENGER') ? 3600 * 8 : 3600 * 10
            }
            times.push({
                type: type,
                accumulatedRestartTime: 0,
                accumulatedTime: 0,
                limitTime: limitTime,
                regulation: regulation,
                restartTime: restartTime
            })
        })
        driverStatusObj.calculatedTimes = times
        let responseObj = await LatestDriverStatus.create(driverStatusObj);
        if (responseObj) {
            let updatedDriverRes = await DriverModel.updateOne({ _id: inputData.driverId }, { latestDriverStatusId: responseObj._id })
            //create HOS Event with DS_OFF
            let logDate = new Date()
            logDate.setHours(0, 0, 0, 0)
            return true
        }
        return false
    }
    function updateDriverDailyLogs(driverDetail, companyId) {
        // return async function (driverDetail) {
        return new Promise(async (resolve, reject) => {
            const dates = [];
            const NUM_OF_DAYS = 14;
            const companyDetail = await CompanyModel.findOne({ _id: companyId });
            let currentLogDate = moment.tz(moment(new Date()), companyDetail.timeZoneId).format("YYYY-MM-DD");
            currentLogDate = new Date(currentLogDate).toISOString();
            for (let i = 0; i < NUM_OF_DAYS; i++) {
                let date = moment(currentLogDate).utcOffset(0, false).subtract(i, 'day');
                dates.push(date);
            }
            let last14DaysLog = _.map(dates, (date) => {
                return {
                    companyId: driverDetail.companyId,
                    driverId: driverDetail._id,
                    logDate: date,
                    timeZone: companyDetail.timeZoneId,
                }
            })
            return DailyLogsModel.insertMany(last14DaysLog)
                .then((dailyLogsCreated) => {
                    let last14thLog = dailyLogsCreated[dailyLogsCreated.length - 1];
                    return createHOSEvents(driverDetail, last14thLog, companyDetail);
                })
                .then(() => {

                    resolve(true)
                })
                .catch(err => {
                    console.error(err);
                    reject(false)
                })
        })
    }
    function createHOSEvents(inputData, log, companydata) {
        return HOSEvent.create({
            companyId: inputData.companyId,
            driverId: inputData.id,
            logId: log._id,
            eventTime: moment(inputData.createdAt).format("HH:mm:ss"),
            logDate: log.logDate,
            timezone: companydata.timeZoneId,
            eventDateTime: log.logDate
        })
    }
    function portelSuccessResponse(portelInfo, message) {
        let portelDetail = portelInfo.toObject()
        portelDetail.id = portelInfo._id
        portelDetail.active = portelInfo.isActive
        return getSuccessResponse({ portel_info: portelDetail }, message, true);
    }
    async function createLatestVehicleStatus(inputData) {
        let vehicleStatusObj = new LatestVehicleStatus({
            companyId: inputData.companyId,
            vehicleId: inputData.vehicleId,
        })


        let responseObj = await vehicleStatusObj.save()
        if (responseObj) {
            const latestStatusId = responseObj._id
            await VehicleModel.updateOne({ _id: inputData.vehicleId }, { latestVehicleStatusId: latestStatusId })
            return true
        }
        return false
    }
    // vehicles -- as far as I remember
    const updateExistingVehicle = (payload, userId) => {
        const { id } = payload;
        return new Promise(async (resolve, reject) => {
            const alreadyExistingVehicle = await VehicleModel.findById(id);

            if (!alreadyExistingVehicle) reject(false);
            let vehicleObj = {};
            vehicleObj.vehicleNumber = payload.vehicleNumber;
            vehicleObj.vehicleModel = payload.model;
            vehicleObj.vehicleMaker = payload.make;
            vehicleObj.plateNumber = payload.plateNumber;
            vehicleObj.plateState = payload.plateLicenseState;
            vehicleObj.fuelType = payload.fuelType;
            vehicleObj.year = payload.year;
            vehicleObj.updatedBy = userId;
            vehicleObj.updatedAt = new Date();
            payload.eld ? vehicleObj.eldId = payload.eld : vehicleObj.eldId = null;
            const updatedObj = await VehicleModel.updateOne({ _id: id }, vehicleObj);
            if (!updatedObj) reject(false);
            resolve(true);
        })
    }
    const getSuccessVehicleResponse = async (id) => {
        const vehicle = await VehicleModel.findById(id);
        const updatedObj = vehicle.toObject();
        updatedObj.id = vehicle._id;
        updatedObj.active = vehicle.isActive;
        return {
            vehicle_info: updatedObj
        }
    }
    // companies 
    const getAllCompanyDetails = (query, model) => {
        return new Promise(async (resolve, reject) => {
            let allData = await model.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: "vehicles",
                        localField: "_id",
                        foreignField: "companyId",
                        as: "vehiclesList"
                    }
                },
                { $sort: { updatedAt: -1 } }
            ]);
            if (!allData.length) {
                resolve({});
            } else {
                const count = await model.countDocuments(query);
                // resolve({data : allData, count: count});
                let totalPages = Math.ceil(count / process.env.WEB_LIMIT);
                let finalResult = {
                    companies: allData,
                    count: count,
                    totalRecord: count,
                    totalPages: totalPages,
                }
                if (allData.length) {
                    allData = JSON.parse(JSON.stringify(allData));
                    finalResult.companies = _.map(allData, (companies) => {
                        companies.vehicleCount = companies.vehiclesList.length;
                        delete companies.vehiclesList;
                        return companies;
                    });
                    resolve(finalResult);
                }
            }
        })
    }

    // ifta 
    async function calculateStatewiseDistance(vehicleIds, startDate, endDate) {
        var start = new Date(startDate)
        var end = new Date(endDate)
        let vehicleLocations = [];
        let locations = await VehicleLocation.find({
            isDeleted: false,
            vehicleId: { $in: vehicleIds },
            status: 'IN_MOTION',
            //'inMotionLocations.eventDate' : { $gte: start, $lte: end }
        }).select({ "vehicleId": 1, "inMotionLocations": 1 })

        if (locations.length > 0) {
            //need to calculate distance from lat lng here using google map api
            var test = locations.map(async (location) => {
                var perStateDistance = []
                let locationDistance = await location.inMotionLocations.map(async (row, index) => {
                    var distance = 0
                    if (!location.inMotionLocations || !location.inMotionLocations.length) {
                        return {
                            state: row.state,
                            distance: distance,
                        };
                    }
                    let locationInMotion = location.inMotionLocations[index + 1];
                    if (locationInMotion && locationInMotion.lat) {
                        distance = await calculteDistance({
                            start_lat: row.lat,
                            start_lng: row.lng,
                            destination_lat: location.inMotionLocations[index + 1].lat,
                            destination_lng: location.inMotionLocations[index + 1].lng
                        })
                    }
                    return {
                        state: row.state,
                        distance: distance,
                    }
                })
                return Promise.all(locationDistance).then((result) => {
                    // console.log("result ghjgjjh----------->",result);
                    result = _.compact(result);
                    let totalDistanceArray = result.map((distanceValue) => distanceValue && distanceValue.distance);
                    let totalDistance = totalDistanceArray.reduce((pre, curr) => pre + curr, 0)
                    return {
                        vehicleId: location.vehicleId,
                        totalDistance: totalDistance, //need tocalculate for dynamic data
                        perStateDistance: result
                    };
                });
            })

            return Promise.all(test).then((result) => {
                //console.log('testResult sahin'+JSON.stringify(result))
                return result[0];
            })
        }

        //for now generating report I am using static data
        //console.log('location'+vehicleLocations)
        return vehicleLocations;
    }
    // eld aggregation query
    function eldAggregation(findCond, skip, limit) {
        return [{
            "$match": findCond
        },
        {
            "$group": {
                "_id": "$vehicleId",
                "count": { "$sum": 1 },
                "eventTime": { $first: '$eventTime' },
                "eventCode": { $first: '$eventCode' },
            }
        },
        {
            "$lookup": {
                from: "vehicles",
                localField: "_id",
                foreignField: "_id",
                as: "vehicle"
            }
        },
        {
            $unwind: '$vehicle'
        },
        {
            "$lookup": {
                from: "elds",
                localField: "eldId",
                foreignField: "eldId",
                as: "eld"
            }
        },
        {
            $unwind: '$eld'
        },
        { $skip: skip },
        { $limit: limit },
        {
            "$sort": { createdAt: -1 }
        },

        {
            "$project": {
                _id: 1,
                count: 1,
                "eventCode": 1,
                "eventTime": 1,
                "vehicle._id": 1,
                "vehicle.vehicleNumber": 1,
                "vehicle.vin": 1,
                "eld.serialNumber": 1,
                "eld.macAddress": 1,
            }
        }]
    }
    const getAllAssetsQueryAggregator = async (findCond, skip) => {
        return new Promise(async (resolve, reject) => {
            const query = [
                // Join with vehicleModel table
                {
                    "$match": findCond
                },
                {
                    "$lookup": {
                        from: "drivers",       // other table name
                        localField: "_id",   // name of users table field
                        foreignField: "assignedVehicleId", // name of userinfo table field
                        as: "asset_info"         // alias for userinfo table
                    }
                },
                { $unwind: { "path": "$asset_info", "preserveNullAndEmptyArrays": true } },     // $unwind used for getting data in object or for one record only

                // Join with user_role table
                {
                    "$lookup": {
                        from: "latestvehiclestatuses",
                        localField: "_id",
                        foreignField: "vehicleId",
                        as: "asset_location"
                    }
                },
                { $unwind: { "path": "$asset_location", "preserveNullAndEmptyArrays": true } },
                //join with eld
                {
                    "$lookup": {
                        from: "elds",
                        localField: "_id",
                        foreignField: "vehicleId",
                        as: "eld_values"
                    }
                },
                { $unwind: { "path": "$eld_values", "preserveNullAndEmptyArrays": true } },

                // define which fields are you want to fetch
                {
                    $project: {
                        _id: 1,
                        vehicleNumber: 1,
                        vin: 1,
                        "asset_info.firstName": 1,
                        "asset_info.lastName": 1,
                        "asset_location.lat": 1,
                        "asset_location.lng": 1,
                        "eld_values.serialNumber": 1,
                        "eld_values.macAddress": 1,
                    }
                },

            ]

            VehicleModel.aggregate([
                // Join with vehicleModel table
                {
                    "$match": findCond
                },
                {
                    "$lookup": {
                        from: "drivers",       // other table name
                        localField: "_id",   // name of users table field
                        foreignField: "assignedVehicleId", // name of userinfo table field
                        as: "asset_info"         // alias for userinfo table
                    }
                },
                { $unwind: { "path": "$asset_info", "preserveNullAndEmptyArrays": true } },     // $unwind used for getting data in object or for one record only

                // Join with user_role table
                {
                    "$lookup": {
                        from: "latestvehiclestatuses",
                        localField: "_id",
                        foreignField: "vehicleId",
                        as: "asset_location"
                    }
                },
                { $unwind: { "path": "$asset_location", "preserveNullAndEmptyArrays": true } },
                //join with eld
                {
                    "$lookup": {
                        from: "elds",
                        localField: "_id",
                        foreignField: "vehicleId",
                        as: "eld_values"
                    }
                },
                { $unwind: { "path": "$eld_values", "preserveNullAndEmptyArrays": true } },

                // define which fields are you want to fetch
                {
                    $project: {
                        _id: 1,
                        vehicleNumber: 1,
                        vin: 1,
                        "asset_info.firstName": 1,
                        "asset_info.lastName": 1,
                        "asset_location.lat": 1,
                        "asset_location.lng": 1,
                        "eld_values.serialNumber": 1,
                        "eld_values.macAddress": 1,
                    }
                },
                { $skip: parseInt(skip) }, { $limit: parseInt(process.env.WEB_LIMIT) }
            ]).exec()
                .then((vehicleList) => {
                    resolve(vehicleList)
                })
                .catch(err => {
                    console.error("error in getting vehicle data ", err)
                    reject([])
                })
        })
    }
    function getUsersWithCompanyName(findUserQuery) {
        return UserModel.aggregate([
            { $match: findUserQuery },
            { "$unwind": "$companiesId" },
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "companiesId",
                    "foreignField": "_id",
                    "as": "companiesObject"
                }
            },
            { "$unwind": "$companiesObject" },
            {
                "$group": {
                    "_id": "$_id",
                    "companiesObject": { "$push": "$companiesObject" },
                    "role": { $first: "$role" },
                    "companyId": { $first: "$companyId" },
                    "firstName": { $first: "$firstName" },
                    "lastName": { $first: "$lastName" },
                    "email": { $first: "$email" },
                    "phoneNumber": { $first: "$phoneNumber" },
                    "landingPage": { $first: "$landingPage" },
                    "isActive": { $first: "$isActive" },
                    "nickName": { $first: "$nickName" },
                    "accessAllCompanies": { $first: "$accessAllCompanies" },
                }
            },
        ])
    }
    function getDriverHOSAggregateList(findCond) {
        return [

            // Join with vehicleModel table
            {
                "$match": findCond
            },
            {
                "$lookup": {
                    from: "drivers",       // other table name
                    localField: "driverId",   // name of users table field
                    foreignField: "_id", // name of userinfo table field
                    as: "driver_info",
                }
            },
            { $unwind: { "path": "$driver_info", "preserveNullAndEmptyArrays": true } },     // $unwind used for getting data in object or for one record only
            {
                "$match": {
                    "isActive": true
                }
            },
            // Join with user_role table
            {
                "$lookup": {
                    from: "vehicles",
                    localField: "vehicleId",
                    foreignField: "_id",
                    as: "vehicle_info"
                }
            },
            { $unwind: { "path": "$vehicle_info", "preserveNullAndEmptyArrays": true } },
            //join with eld
            {
                "$lookup": {
                    from: "dailylogs",
                    localField: "dailyLogId",
                    foreignField: "_id",
                    as: "logs_info"
                }
            },
            { $unwind: { "path": "$logs_info", "preserveNullAndEmptyArrays": true } },
            // define which fields are you want to fetch
            {
                $project: {
                    _id: 1,
                    currentStatus: 1,
                    cycleTimeAvailableTomorrow: 1,
                    calculatedTimes: 1,
                    driverId: 1,
                    "driver_info.firstName": 1,
                    "driver_info.lastName": 1,
                    "driver_info.isActive": 1,
                    "vehicle_info.vehicleNumber": 1,
                    "vehicle_info.eldConnectionInterface": 1,
                    "logs_info.hasViolation": 1,
                    "logs_info.lastsync": 1,
                    "logs_info.logDate": 1,
                }

            },
            {
                "$match": {
                    "driver_info.isActive": true
                }
            },
        ]
    }
    function getDriverHOSAggregate(findCond, skip, limit) {
        return [

            // Join with vehicleModel table
            {
                "$match": findCond
            },
            {
                "$lookup": {
                    from: "drivers",       // other table name
                    localField: "driverId",   // name of users table field
                    foreignField: "_id", // name of userinfo table field
                    as: "driver_info",
                }
            },
            { $unwind: { "path": "$driver_info", "preserveNullAndEmptyArrays": true } },     // $unwind used for getting data in object or for one record only
            // Join with user_role table
            {
                "$lookup": {
                    from: "vehicles",
                    localField: "vehicleId",
                    foreignField: "_id",
                    as: "vehicle_info"
                }
            },
            { $unwind: { "path": "$vehicle_info", "preserveNullAndEmptyArrays": true } },
            //join with eld
            {
                "$lookup": {
                    from: "dailylogs",
                    localField: "dailyLogId",
                    foreignField: "_id",
                    as: "logs_info"
                }
            },
            { $unwind: { "path": "$logs_info", "preserveNullAndEmptyArrays": true } },
            // define which fields are you want to fetch
            {
                $project: {
                    _id: 1,
                    currentStatus: 1,
                    cycleTimeAvailableTomorrow: 1,
                    calculatedTimes: 1,
                    driverId: 1,
                    createdAt: 1,
                    "driver_info.firstName": 1,
                    "driver_info.lastName": 1,
                    "driver_info.isActive": 1,
                    "vehicle_info.vehicleNumber": 1,
                    "vehicle_info.eldConnectionInterface": 1,
                    "logs_info.hasViolation": 1,
                    "logs_info.lastsync": 1,
                    "logs_info.logDate": 1,
                }

            },
            {
                "$match": {
                    "driver_info.isActive": true
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]
    }
    async function getLastEvent(driverId, eventDateTime, isEmpty) {
        let lastEvent = {}
        var findCond = {
            isDeleted: false,
            eventStatus: 'ACTIVE',
            driverId: driverId,
            eventCode: { $in: eventCodeArr },
            eventDateTime: { $lt: eventDateTime }
        }
        if (isEmpty) {
            delete findCond.eventDateTime;
            findCond.logDate = { $lt: eventDateTime }
        }
        let hosEvents = await HOSEvent.find(findCond).populate({
            path: 'driverId',
            select: { "firstName": 1, "lastName": 1 }
        }).populate({
            path: 'vehicleId',
            select: { "vehicleNumber": 1 }
        }).populate({
            path: 'eldId',
            select: { "serialNumber": 1, "macAddress": 1 }
        }).populate({
            path: 'createdBy',
            select: { "firstName": 1, "lastName": 1 }
        }).populate({
            path: 'logId',
            select: { "logDate": 1 }
        }).limit(1).skip(0).sort({ eventDateTime: -1 })
        if (hosEvents.length > 0) {
            let lastLogEvent = hosEvents[0]
            lastEvent = {
                id: lastLogEvent._id,
                timezone: lastLogEvent.timezone,
                eventTime: lastLogEvent.eventTime,
                driverStatus: lastLogEvent.eventCode,
                isActive: lastLogEvent.isActive,
                event_code: null,
                event_type: null,
                record_status: lastLogEvent.eventStatus,
                origin_code: lastLogEvent.recordOrigin,
                client_id: "",
                status: lastLogEvent.eventCode,
                start_date: lastLogEvent.eventDateTime,
                logDate: lastLogEvent.logDate,
                end_date: (lastLogEvent.eventEndDateTime) ? lastLogEvent.eventEndDateTime : null,
                address: (lastLogEvent.calculatedLocation) ? lastLogEvent.calculatedLocation : lastLogEvent.manualLocation,
                note: lastLogEvent.notes,
                creator: "Driver",
                coordinates: { lat: parseFloat(lastLogEvent.lat), lng: parseFloat(lastLogEvent.lng) },
                gps_coordinates: "",
                fused_coordinates: "",
                eld_coordinates: "",
                odometr: (lastLogEvent.odometer) ? lastLogEvent.odometer : "0",
                engine_hours: (lastLogEvent.engineHours) ? lastLogEvent.engineHours : "0",
                driver_signature: "",
                eld_address: (lastLogEvent.macAddress) ? lastLogEvent.eldId.macAddress : '',
                malfunction_diagnostic: "",
                debug_info: "",
                delta_distance: "",
                sequenceId: lastLogEvent.seqId,
                malfunction: "",
                diagnostic: "",
                shipping_document: "",
                document: "",
                trailer: "",
                accessToken: "",
                is_live: true,
                inspection: lastLogEvent.inspection,
                certify_date: (lastLogEvent.certifiedRecordDate) ? lastLogEvent.certifiedRecordDate : '',
                is_seen: "",
                createdAt: lastLogEvent.createdAt,
                updatedAt: lastLogEvent.updatedAt,
                editedById: lastLogEvent.updatedBy,
                sendedById: "",
                driverId: (lastLogEvent.driverId) ? lastLogEvent.driverId._id : '',
                vehicleId: (lastLogEvent.vehicleId) ? lastLogEvent.vehicleId._id : '',
                companyId: lastLogEvent.companyId,
                eldId: (lastLogEvent.eldId) ? lastLogEvent.eldId._id : '',
                location: (lastLogEvent.calculatedLocation) ? lastLogEvent.calculatedLocation : lastLogEvent.manualLocation,
                vehicleNumber: (lastLogEvent.vehicleId) ? lastLogEvent.vehicleId.vehicleNumber : "",
                eventTime: lastLogEvent.eventTime,
                recordOrigin: lastLogEvent.recordOrigin,
                totalVehicleMiles: lastLogEvent.odometer,
                totalEngineHours: lastLogEvent.engineHours,
                eventCode: lastLogEvent.eventCode,
                driverStatus: lastLogEvent.eventCode,
                notes: lastLogEvent.notes,
                isActive: lastLogEvent.isActive,
                positioning: lastLogEvent.positioning,
                manualLocation: lastLogEvent.manualLocation,
                calculatedLocation: lastLogEvent.calculatedLocation,
                isEditable: (lastLogEvent.suggestedEditEventsId) ? false : true,
                userId: (lastLogEvent.createdBy) ? lastLogEvent.createdBy._id : '',
                userName: (lastLogEvent.createdBy) ? lastLogEvent.createdBy.firstName.concat(" ", lastLogEvent.createdBy.lastName) : '',
            }
        }
        return lastEvent
    }
    async function getDailyLogInfo(logId, hosEventList) {
        hosEventList = _.filter(hosEventList, (event) => {
            if (eventCodeArr.includes(event.eventCode)) return event;
        })
        let lastHosEvent = hosEventList.length && hosEventList[hosEventList.length - 1];
        let details = {}
        let info = await DailyLog.findById(logId)
            .populate({
                path: 'companyId',
                select: { "companyName": 1, "dotNumber": 1, "address": 1, "phoneNumber": 1, "timeZoneId": 1 }
            }).populate({
                path: 'driverId',
                populate: {
                    path: 'latestDriverStatusId',
                    populate: {
                        path: 'vehicleId',
                        populate: [{
                            path: 'latestVehicleStatusId',
                            select: { "odometer": 1, "engineHours": 1 }
                        },
                        {
                            path: 'eldId',
                            select: { "serialNumber": 1, "macAddress": 1 }
                        }],
                        select: { "vehicleNumber": 1, "vin": 1 }
                    },
                    select: { "ELDConnected": 1 }
                },
                select: { "firstName": 1, "lastName": 1, "userName": 1, "exempt": 1, "homeTerminal": 1, "latestDriverStatusId": 1, "licenseNumber": 1, "licenseState": 1, "cycle": 1, "cargoType": 1, "restartHours": 1, "restBreak": 1 }
            }).populate({
                path: 'coDriverId',
                select: { "userName": 1, "firstName": 1, "lastName": 1 }
            })
            .select({
                "companyId": 1,
                "trailers": 1,
                "shippingDocuments": 1,
                "isCertified": 1,
                "timeZoneId": 1,
                "logDate": 1,
                "shiftStart": 1,
                "cycleStart": 1,
                "violations": 1,
                "coDriverId": 1
            })

        details = info.toObject()
        details.id = (info.driverId) ? info._id : ''
        details.driverId = (info.driverId) ? info.driverId._id : ''
        details.driverUsername = (info.driverId) ? info.driverId.userName : ''
        details.driverName = (info.driverId) ? info.driverId.firstName.concat(" ", info.driverId.lastName) : ''
        details.exempt = (info.driverId) ? info.driverId.exempt : ''
        details.homeTerminal = (info.driverId) ? info.driverId.homeTerminal : ''
        details.licenseNumber = (info.driverId) ? info.driverId.licenseNumber : ''
        details.licenseState = (info.driverId) ? info.driverId.licenseState : ''
        details.cycleRule = info.driverId.cycle
        details.cargoType = info.driverId.cargoType
        details.restartHours = info.driverId.restartHours
        details.restBreak = info.driverId.restBreak
        details.coDriverId = (info.coDriverId) ? info.coDriverId._id : ''
        details.coDriverUsername = (info.coDriverId) ? info.coDriverId.userName : ''
        details.coDriverName = (info.coDriverId) ? info.coDriverId.firstName.concat(" ", info.coDriverId.lastName) : ''

        if (info.driverId.latestDriverStatusId) {
            let latestDriverStatus = info.driverId.latestDriverStatusId;
            details.vehicleId = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId._id : '';
            details.vehicleNumber = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId.vehicleNumber : '';
            details.vin = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId.vin : '';
            details.eldId = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId._id ? latestDriverStatus.vehicleId.eldId._id : '';
            details.serialNumber = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId.serialNumber ? latestDriverStatus.vehicleId.eldId.serialNumber : '';
            details.macAddress = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId.macAddress ? latestDriverStatus.vehicleId.eldId.macAddress : '';
            details.odometer = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.latestVehicleStatusId && latestDriverStatus.vehicleId.latestVehicleStatusId.odometer ? latestDriverStatus.vehicleId.latestVehicleStatusId.odometer : '';
            details.engineHours = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.latestVehicleStatusId && latestDriverStatus.vehicleId.latestVehicleStatusId.engineHours ? latestDriverStatus.vehicleId.latestVehicleStatusId.engineHours : '';
        }

        let driverStatus = await LatestDriverStatus.findOne({ driverId: details.driverId }).select({ "calculatedTimes": 1 });
        if (!driverStatus) return false;
        else {
            
            JSON.parse(JSON.stringify(driverStatus)).calculatedTimes = _.map(driverStatus.calculatedTimes, (status) => {
                status.accumulatedRestartTime = 0;
                status.accumulatedTime = 0;
                return status;
            })
            let { driverStatusInfo, violationObject } = await getCalculatedHOSEventsTime(driverStatus, details.driverId);
            details.break = driverStatusInfo.break;
            details.drive = driverStatusInfo.drive;
            details.shift = driverStatusInfo.shift;
            details.cycle = driverStatusInfo.cycle;
            details.violationRanges = violationObject;
            return details
        }
    }
    function getLastTwoWeeksDate(currentDate) {
        const NUM_OF_DAYS = 14;
        let dates = [];
        for (let i = 0; i <= NUM_OF_DAYS; i++) {
            let date = moment(currentDate).utcOffset(0, false).subtract(i, 'day');
            dates.push(date);
        }
        return dates.reverse();
    }
    async function getCalculatedHOSEventsTime(driverStatus, driverId) {
        if (!driverStatus) return getSuccessResponse({}, "Driver not found", false);
        let currentTime = new Date().toISOString();
        let currentLogDate = moment(currentTime).utcOffset(0, false).format("YYYY-MM-DD");
        currentLogDate = new Date(currentLogDate).toISOString();
        let lastTwoWeekLogDates = getLastTwoWeeksDate(currentLogDate);
        let lastTwoWeeksHosEvent = [];
        await promise.map(lastTwoWeekLogDates, async (logDate) => {
            let hosEventListInOrder = await HOSEvent.find({ driverId: driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, logDate: logDate }).sort({ eventDateTime: 1, });
            lastTwoWeeksHosEvent = _.concat(lastTwoWeeksHosEvent, hosEventListInOrder);
        })
        lastTwoWeeksHosEvent = _.orderBy(lastTwoWeeksHosEvent, ['eventDateTime'], ['asc']);
        let statusObject = _.map(lastTwoWeeksHosEvent, (event, index) => {
            if (lastTwoWeeksHosEvent.length - 1 != index) {
                let eventEndDateTime = lastTwoWeeksHosEvent[index + 1].eventDateTime;
                let difference = new Date(eventEndDateTime).getTime() - new Date(event.eventDateTime).getTime();
                return {
                    driverStatus: event.eventCode,
                    timeDifference: Math.round(difference / 1000),
                    startTime: event.eventDateTime,
                    endTime: eventEndDateTime,
                    logDate: event.logDate
                }
            } else {
                let difference = new Date(currentTime).getTime() - new Date(event.eventDateTime).getTime();

                return {
                    driverStatus: event.eventCode,
                    timeDifference: Math.round(difference / 1000),
                    startTime: event.eventDateTime,
                    endTime: currentTime,
                    logDate: event.logDate
                }
            }
        })
        let driverCalculatedTimes = await updateDriverStatusByLogedEvent(statusObject, driverStatus)
        return driverCalculatedTimes;
    }
    function getViolationInfo(statusInfo, statusObject) {
        let extraTimeSeconds = statusInfo.accumulatedTime - statusInfo.limitTime;
        let startTimeAfterCompleteLimitTime = moment(statusObject.startTime).utcOffset(0, false).add(statusInfo.limitTime, 'seconds').toISOString()
        return {
            startTime: startTimeAfterCompleteLimitTime,
            endTime: statusObject.endTime,
            regulation: statusInfo.regulation,
            logDate: statusObject.logDate,
            status: statusObject.driverStatus
        }

    }
    async function updateDriverStatusByLogedEvent(driverEventStatusList, driverStatus) {
        let violationObject = [];
        _.forEach(driverEventStatusList, (statusObject) => {
            driverStatus.calculatedTimes = _.map(driverStatus.calculatedTimes, (statusInfo) => {
                if (statusInfo.type == 'shiftTime') {
                    if (cycleTimeAccumulatedTimeEnum.includes(statusObject.driverStatus))
                        statusInfo.accumulatedRestartTime = 0;
                    if (shiftTimeAccumulatedTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedTime = statusInfo.accumulatedTime + statusObject.timeDifference;
                        if (statusInfo.accumulatedTime > statusInfo.limitTime && shiftTimeViolationTimeEnum.includes(statusObject.driverStatus)) {
                            violationObject.push(getViolationInfo(statusInfo, statusObject));
                        }
                    }
                    if (shiftTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus))
                        statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
                    if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                        statusInfo.accumulatedTime = 0;
                    }
                }
                if (statusInfo.type == 'driveTime') {
                    if (cycleTimeAccumulatedTimeEnum.includes(statusObject.driverStatus))
                        statusInfo.accumulatedRestartTime = 0;
                    if (driveTimeAccumulatedTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedTime = statusInfo.accumulatedTime + statusObject.timeDifference;
                        if (statusInfo.accumulatedTime > statusInfo.limitTime && shiftTimeViolationTimeEnum.includes(statusObject.driverStatus)) {
                            violationObject.push(getViolationInfo(statusInfo, statusObject));
                        }
                    }
                    if (driveTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus))
                        statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
                    if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                        statusInfo.accumulatedTime = 0;
                    }
                }
                if (statusInfo.type == 'cycleTime') {
                    if (cycleTimeAccumulatedTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedRestartTime = 0;
                        statusInfo.accumulatedTime = statusInfo.accumulatedTime + statusObject.timeDifference;
                        if (statusInfo.accumulatedTime > statusInfo.limitTime && shiftTimeViolationTimeEnum.includes(statusObject.driverStatus)) {
                            violationObject.push(getViolationInfo(statusInfo, statusObject));
                        }
                    }
                    if (cycleTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
                    }
                    if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                        statusInfo.accumulatedTime = 0;
                    }
                }
                if (statusInfo.type == 'breakTime') {
                    if (breakTimeAccumulatedTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedTime = statusInfo.accumulatedTime + statusObject.timeDifference;
                        statusInfo.accumulatedRestartTime = 0;
                        if (statusInfo.accumulatedTime > statusInfo.limitTime) {
                            violationObject.push(getViolationInfo(statusInfo, statusObject));
                        }
                    }
                    if (breakTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus)) {
                        statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
                    }
                    if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                        statusInfo.accumulatedTime = 0;
                    }
                }
                return statusInfo;
            })
        })
        let driverStatusInfo = {};
        _.forEach(driverStatus.calculatedTimes, (statusInfo) => {
            if (statusInfo.type == 'shiftTime') {
                driverStatusInfo.shift = statusInfo.limitTime - statusInfo.accumulatedTime
                driverStatusInfo.shift = driverStatusInfo.shift > 0 ? driverStatusInfo.shift : 0;
            }
            if (statusInfo.type == 'driveTime') {
                driverStatusInfo.drive = statusInfo.limitTime - statusInfo.accumulatedTime
                driverStatusInfo.drive = driverStatusInfo.drive > 0 ? driverStatusInfo.drive : 0;
            }
            if (statusInfo.type == 'cycleTime') {
                driverStatusInfo.cycle = statusInfo.limitTime - statusInfo.accumulatedTime;
                driverStatusInfo.cycle = driverStatusInfo.cycle > 0 ? driverStatusInfo.cycle : 0;
            }
            if (statusInfo.type == 'breakTime') {
                driverStatusInfo.break = statusInfo.limitTime - statusInfo.accumulatedTime;
                driverStatusInfo.break = driverStatusInfo.break > 0 ? driverStatusInfo.break : 0;
            }
        })
        return { driverStatusInfo, violationObject };
    }
    async function getDailyLogInfoForPDF(logId, hosEventList) {
        hosEventList = _.filter(hosEventList, (event) => {
            if (eventCodeArr.includes(event.eventCode)) return event;
        })
        let lastHosEvent = hosEventList.length && hosEventList[hosEventList.length - 1];
        let details = {}
        let info = await DailyLog.findById(logId)
            .populate({
                path: 'companyId',
                select: { "companyName": 1, "dotNumber": 1, "address": 1, "phoneNumber": 1, "timeZoneId": 1 }
            }).populate({
                path: 'driverId',
                populate: {
                    path: 'latestDriverStatusId',
                    populate: {
                        path: 'vehicleId',
                        populate: [{
                            path: 'latestVehicleStatusId',
                            select: { "odometer": 1, "engineHours": 1 }
                        },
                        {
                            path: 'eldId',
                            select: { "serialNumber": 1, "macAddress": 1 }
                        }],
                        select: { "vehicleNumber": 1, "vin": 1 }
                    },
                    select: { "ELDConnected": 1 }
                },
                select: { "firstName": 1, "lastName": 1, "userName": 1, "exempt": 1, "homeTerminal": 1, "latestDriverStatusId": 1, "licenseNumber": 1, "licenseState": 1, "cycle": 1, "cargoType": 1, "restartHours": 1, "restBreak": 1 }
            }).populate({
                path: 'coDriverId',
                select: { "userName": 1, "firstName": 1, "lastName": 1 }
            })
            .select({
                "companyId": 1,
                "trailers": 1,
                "shippingDocuments": 1,
                "isCertified": 1,
                "timeZoneId": 1,
                "logDate": 1,
                "shiftStart": 1,
                "cycleStart": 1,
                "violations": 1,
                "coDriverId": 1
            })

        details = info.toObject()

        details.id = (info.driverId) ? info._id : ''
        details.driverId = (info.driverId) ? info.driverId._id : ''
        details.driverUsername = (info.driverId) ? info.driverId.userName : ''
        details.driverName = (info.driverId) ? info.driverId.firstName.concat(" ", info.driverId.lastName) : ''
        details.exempt = (info.driverId) ? info.driverId.exempt : ''
        details.homeTerminal = (info.driverId) ? info.driverId.homeTerminal : ''
        details.licenseNumber = (info.driverId) ? info.driverId.licenseNumber : ''
        details.licenseState = (info.driverId) ? info.driverId.licenseState : ''
        details.cycleRule = info.driverId.cycle
        details.cargoType = info.driverId.cargoType
        details.restartHours = info.driverId.restartHours
        details.restBreak = info.driverId.restBreak
        details.coDriverId = (info.coDriverId) ? info.coDriverId.userName : ''
        details.coDriverName = (info.coDriverId) ? info.coDriverId.firstName.concat(" ", info.coDriverId.lastName) : ''

        if (info.driverId.latestDriverStatusId) {
            let latestDriverStatus = info.driverId.latestDriverStatusId;
            details.vehicleId = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId._id : '';
            details.vehicleNumber = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId.vehicleNumber : '';
            details.vin = latestDriverStatus.vehicleId ? latestDriverStatus.vehicleId.vin : '';
            details.eldId = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId._id ? latestDriverStatus.vehicleId.eldId._id : '';
            details.serialNumber = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId.serialNumber ? latestDriverStatus.vehicleId.eldId.serialNumber : '';
            details.macAddress = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.eldId && latestDriverStatus.vehicleId.eldId.macAddress ? latestDriverStatus.vehicleId.eldId.macAddress : '';
            details.odometer = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.latestVehicleStatusId && latestDriverStatus.vehicleId.latestVehicleStatusId.odometer ? latestDriverStatus.vehicleId.latestVehicleStatusId.odometer : '';
            details.engineHours = latestDriverStatus.vehicleId && latestDriverStatus.vehicleId.latestVehicleStatusId && latestDriverStatus.vehicleId.latestVehicleStatusId.engineHours ? latestDriverStatus.vehicleId.latestVehicleStatusId.engineHours : '';
        }

        var remainingBreakTime = 0
        var remainingDriveTime = 0
        var remainingShiftTime = 0
        var remainingCycleTime = 0
        let driverStatus = await LatestDriverStatus.findOne({ driverId: details.driverId }).select({ "calculatedTimes": 1 })
        if (driverStatus) driverStatus = JSON.parse(JSON.stringify(driverStatus));

        driverStatus = getCalculatedHosTimeEventsPDFLogs(lastHosEvent, driverStatus);
        if (driverStatus) {
            driverStatus.calculatedTimes.map((tRow) => {
                switch (tRow.type) {
                    case 'breakTime':
                        remainingBreakTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
                        break;
                    case 'driveTime':
                        remainingDriveTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
                        break;
                    case 'cycleTime':
                        remainingCycleTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
                        break;
                    default:
                        remainingShiftTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
                }
            })
        }



        details.break = remainingBreakTime
        details.drive = remainingDriveTime
        details.shift = remainingShiftTime
        details.cycle = remainingCycleTime

        //console.log('details'+details)
        return details
    }
    function getCalculatedHosTimeEventsPDFLogs(lastHosEvent, driverStatus) {
        if (!driverStatus || !driverStatus.calculatedTimes) return driverStatus;
        let timeDifference = new Date().getTime() - new Date(lastHosEvent.start_date).getTime();
        timeDifference = Math.round(timeDifference / 1000);
        let shiftTimeAccumulatedTimeEnum = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
        let shiftTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
        let driveTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
        let cycleTimeAccumulatedTimeEnum = ['DS_ON', 'DS_D', 'DR_IND_YM'];
        let cycleTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
        let breakTimeAccumulatedTimeEnum = ['DS_D'];
        let breakTimeAccumulatedRestartTimeEnum = ['DS_ON', 'DS_OFF', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
        driverStatus.calculatedTimes = _.map(driverStatus.calculatedTimes, (statusInfo) => {
            if (statusInfo.type == 'shiftTime') {
                if (shiftTimeAccumulatedTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedTime = statusInfo.accumulatedTime + timeDifference;
                if (shiftTimeAccumulatedRestartTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + timeDifference;
                if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                    statusInfo.accumulatedTime = 0;
                    statusInfo.accumulatedRestartTime = 0;
                }
            }
            if (statusInfo.type == 'driveTime') {
                if (driveTimeAccumulatedTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedTime = statusInfo.accumulatedTime + timeDifference;
                if (driveTimeAccumulatedRestartTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + timeDifference;
                if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                    statusInfo.accumulatedTime = 0;
                    statusInfo.accumulatedRestartTime = 0;
                }
            }
            if (statusInfo.type == 'cycleTime') {
                if (cycleTimeAccumulatedTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedTime = statusInfo.accumulatedTime + timeDifference;
                if (cycleTimeAccumulatedRestartTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + timeDifference;
                if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                    statusInfo.accumulatedTime = 0;
                    statusInfo.accumulatedRestartTime = 0;
                }
            }
            if (statusInfo.type == 'breakTime') {
                if (breakTimeAccumulatedTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedTime = statusInfo.accumulatedTime + timeDifference;
                if (breakTimeAccumulatedRestartTimeEnum.includes(lastHosEvent.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + timeDifference;
                if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                    statusInfo.accumulatedTime = 0;
                    statusInfo.accumulatedRestartTime = 0;
                }
            }
            return statusInfo;
        })
        return driverStatus;
    }
    function findDayMonthYear() {
        const today = new Date()
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${days[today.getDay()]} ${today.toLocaleString('default', { month: 'long' })} ${today.getDate()} ${today.getFullYear()}`
    }
    const OldMetersTableHtml = (data) => {
        let newhtml = ''
        if (data && data.length) {
            data.map(val => {
                newhtml += '<tr>'

                newhtml += `<td style="text-align: left;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(val.vehicleNumber) ? val.vehicleNumber.vehicleModel : ''}</span> </p></td>`
                newhtml += `<td style="text-align: left;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(val.vehicleNumber) ? val.vehicleNumber.vehicleModel : ''}</span></p></td>`
                newhtml += `<td style="text-align: left;"> <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(val.startplace) ? val.startplace : ''}</span></p></td>`
                newhtml += `<td style="text-align: left;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(val.endPlace) ? val.endPlace : ''}</span></p></td>`
                newhtml += `<td style="text-align: left;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(val.distance) ? val.distance : 0}</span></p></td>`
                // newhtml += `<td style="padding: 2px 10px; text-align: center; border-bottom: 3px solid #000;">${(val.vehicleNumber) ? val.vehicleNumber.vehicleModel : ''}</td>`
                // newhtml += `<td style="padding: 2px 10px; text-align: center; border-bottom: 3px solid #000;">${(val.startplace) ? val.startplace : ''}</td>`
                // newhtml += `<td style="padding: 2px 10px; text-align: center; border-bottom: 3px solid #000;">${(val.endPlace) ? val.endPlace : ''}</td>`
                // newhtml += `<td style="padding: 2px 10px; text-align: center; border-bottom: 3px solid #000;">${(val.distance) ? val.distance : 0}</td>`
                newhtml += '</tr>'
            })
        } else {
            newhtml = `<tr>
            <td colspan="4" style="text-align: center;">no records</td>
          </tr>`
        }

        return newhtml
    }
    const generateHTML = (companyInfo, driverInfo, vehicleInfo, graphData, allDetails, oldmeters) => {
        // <img src="https://s3.amazonaws.com/lucid.reports/chardaypset.png" width="100%" height="100%" style="padding:30px 0">
        let dataStr = findDayMonthYear()
        return `<!doctype html>
        <html>
        
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400&display=swap" rel="stylesheet">
          <style>
            body {
              width: 70%;
              margin: 50px auto;
              font-family: 'Inter', sans-serif;
            }
          </style>
        
        <body>
          <div style="text-align:center; margin-bottom: 30px;">
            <h1 style="margin-bottom: 0; font-weight: bolder; font-size: 30px; color: #1d2939;">DRIVER’S DAILY LOG</h1>
            <h3 style="margin: 10px 0; font-weight: bolder; font-size: 20px; color: #344054;">${dataStr}</h3>
            <p style="margin: 0; font-weight: 500; font-size: 15px; color: #667085;">USA Property 70 hour / 8 day</p>
        
          </div>
          <table width="100%" style="margin-bottom: 15px; border: 2px solid #d0d5dd; border-radius: 9px;">
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Driver Name</strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${driverInfo.driverName}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Driver ID </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${driverInfo.driverUsername}</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">DL State</strong> </p>
              </td>
              <td width="30%"
                style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${driverInfo.licenseState}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">DL# </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${driverInfo.licenseNumber}</span></p>
              </td>
            </tr>
        
        
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Co-Driver Name</strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(driverInfo.coDriverName) ?
                driverInfo.coDriverId : "NA"}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Co-Driver ID </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(driverInfo.coDriverId) ?
                driverInfo.coDriverId : "NA"}</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Carrier </strong> </p>
              </td>
              <td width="30%" colspan="3"
                style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${companyInfo.companyName}</span></p>
              </td>
            </tr>
        
        
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Main Office</strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${companyInfo.address}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Home Terminal </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${companyInfo.address}</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Driver Certified </strong> </p>
              </td>
              <td width="30%" colspan="3"
                style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(driverInfo.exempt) ? 'Yes' : 'No'}</span>
                </p>
              </td>
            </tr>
        
        
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Trailers </strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(allDetails.trailers) ? allDetails.trailers
                : 'NA'}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Shipping Docs </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(allDetails.shippingDocuments) ?
                allDetails.shippingDocuments : 'missing'}</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Exempt Driver Status </strong> </p>
              </td>
              <td width="30%"
                style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(driverInfo.exempt) ? 'Yes' : 'No'}</span>
                </p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Unidentified Driver Records
                  </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">0</span></p>
              </td>
            </tr>
        
        
        
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">ELD Malfunction Indicators </strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(vehicleInfo.deviceMalfunction) ?
                vehicleInfo.deviceMalfunction : 'NO'}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">Data Diagnostic Indicators
                  </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(vehicleInfo.deviceDiagnostic) ?
                vehicleInfo.deviceDiagnostic : 'NO'}</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Current Location </strong> </p>
              </td>
              <td width="30%" colspan="3"
                style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;"></span></p>
              </td>
            </tr>
        
        
            <tr>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Timezone (Offset) </strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">${companyInfo.timeZoneId}</span></p>
              </td>
              <td width="20%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">24 Hour Start Time </strong></p>
        
              </td>
              <td width="30%" style="text-align: left; border-bottom: 2px solid #eaecf0;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">Midnight</span></p>
              </td>
            </tr>
            <tr>
              <td width="20%" style="text-align: left; background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">ELD ID </strong> </p>
              </td>
              <td width="30%" style="text-align: left; border-right: 2px solid #eaecf0;  background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">LUCID1</span></p>
              </td>
              <td width="20%" style="text-align: left;  background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><strong style="width:40%; color:#344054;">ELD PROVIDER </strong></p>
        
              </td>
              <td width="30%" style="text-align: left;  background-color: #fcfcfd;">
                <p style="padding: 10px; margin: 0;"><span style="color:#344054;">LUCID ELD</span></p>
              </td>
            </tr>
          </table>
          <h2 style="text-align: center; color: #344054; margin-bottom: 20px; font-size: 22px; font-weight: bolder;">ODOMETERS
          </h2>
          <table width="100%" style="margin-bottom: 15px; border: 2px solid #d0d5dd; border-radius: 9px;">
            <tr style="background-color: #f9fafb;">
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 15%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Vehicle</strong> </p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 25%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Vehicle</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 20%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Start</strong></p>
        
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 20%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">End</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 20%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Distance</strong></p>
              </th>
            </tr>
            ${OldMetersTableHtml(oldmeters)}
          </table>
        
        
          <h2 style="text-align: center; color: #344054; margin-bottom: 20px; font-size: 22px; font-weight: bolder;">EVENT LOGS
          </h2>
          <table width="100%" style="margin-bottom: 15px; border: 2px solid #d0d5dd; border-radius: 9px;">
            <tr style="background-color: #f9fafb;">
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 12%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Time</strong> </p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 13%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Duration</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 12%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Status</strong></p>
        
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 15%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Location</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 10%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Odometer</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 15%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Engine Hours</strong></p>
        
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 13%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Origin</strong></p>
              </th>
              <th style="text-align: left; border-bottom: 2px solid #eaecf0; width: 10%;">
                <p style="padding: 10px; margin: 0;"><strong style="color:#344054;">Notes</strong></p>
              </th>
            </tr>
            ${createLogsHtmlTable(graphData)}
          </table>
        </body>
        
        </html>`
    }
    async function diffTime(start, end) {
        try {
            var startDate = new Date(start);
            var endDate = new Date(end);
            var diff = endDate.getTime() - startDate.getTime();
            var hours = Math.floor(diff / 1000 / 60 / 60);
            diff -= hours * 1000 * 60 * 60;
            var minutes = Math.floor(diff / 1000 / 60);

            // If using time pickers with 24 hours format, add the below line get exact hours
            if (hours < 0)
                hours = hours + 24;

            return (hours <= 9 ? "0" : "") + hours + ":" + (minutes <= 9 ? "0" : "") + minutes;

        } catch (error) {
            console.log(error)
        }

    }
    const createLogsHtmlTable = (data) => {
        let obj = {
            "DS_OFF": "Off Duty",
            "DS_SB": "Sleeper",
            "DS_D": "Driving",
            "DS_ON": "On Duty",
            "DR_IND_YM": "Yard Move",
            "DR_IND_PC": "Personal Conveyance",
            "DR_CERT_1": "Certification (1)",
            "DR_CERT_2": "Certification (2)",
            "DR_CERT_3": "Certification (3)",
            "DR_CERT_4": "Certification (4)",
            "DR_CERT_5": "Certification (5)",
            "DR_CERT_6": "Certification (6)",
            "DR_CERT_7": "Certification (7)",
            "DR_CERT_8": "Certification (8)",
            "DR_CERT_9": "Certification (>=9)",
            "INTER_NORMAL_PRECISION": "Intermediate w/CLP",
            "ENG_UP_NORMAL": "Engine Power-up w/CLP",
            "ENG_DOWN_NORMAL": "Engine Shut-down w/CLP",
            "DR_LOGIN": "Login",
            "DR_LOGOUT": "Logout",
            "INTER_REDUCED_PERCISION": "Intermediate w/RLP",
            "ENG_UP_REDUCED": "Engine Power-up w/RLP",
            "ENG_DOWN_REDUCED": "Engine Shut-down w/RLP",
        }
        let tblLogs = '';
        data.map(async (val, i) => {
            // distance = await calculteDistance({
            //     start_lat: row.lat,
            //     start_lng: row.lng,
            //     destination_lat: location.inMotionLocations[index + 1].lat,
            //     destination_lng: location.inMotionLocations[index + 1].lng
            // })
            let dif = diffTime(val.start_date, val.end_date);
            (i % 2 == 0) ? tblLogs += '<tr>' : tblLogs += '<tr style="background-color:#fcfcfd;">'

            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${new Date(val.start_date).getHours()}:${new Date(val.start_date).getMinutes()}:00</span> </p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${dif}</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${(obj[val.driverStatus]) ? obj[val.driverStatus] : 'NA'}</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${val.location}</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${val.odometr}</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">${val.engine_hours}</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;">Driver</span></p></td>`
            tblLogs += `<td style="text-align: left;  border-bottom: 2px solid #eaecf0;"><p style="padding: 10px; margin: 0;"><span style="color:#344054;"> ${(val.notes) ? val.notes : 'NA'} </span></p></td>`

            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${i}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${(obj[val.driverStatus])? obj[val.driverStatus]: 'NA'}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${new Date(val.start_date).getHours()}:${new Date(val.start_date).getMinutes()}:00</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${dif}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${val.location}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${val.odometr}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${val.engine_hours}</td>`
            // tblLogs += `<td style="padding: 2px 10px; text-align: left; border-bottom: 3px solid #000;">${(val.notes) ? val.notes : 'NA'}</td>`

            tblLogs += '</tr>'
        })

        return tblLogs;
    }
    const getVehicleLocationHistory = async (vehicleId, companyId, searchDate) => {
        try {
            let findCond = {
                vehicleId: vehicleId,
                companyId: companyId,
                isDeleted: false
            }
            if (searchDate) {
                var startDate = searchDate;
                var endDate = searchDate;
                var start = new Date(startDate);
                start.setHours(0, 0, 0, 0);

                var end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                findCond.startTime = { $gte: start, $lte: end }
            }
            let locationList = await LocationHistory.find(findCond).populate({
                path: 'vehicleId',
                // select: { "vehicleNumber": 1 }
            })
            let list = []
            if (locationList.length > 0) {
                // let filteredLocations = locationList.filter(e => e.inMotionLocations.eventCode == 'TRIP_START')
                // console.log(filteredLocations)
                locationList = JSON.parse(JSON.stringify(locationList));
                let locations = [];
                let stations = [];
                locationList.map(async (row) => {
                    if (row.status == 'IN_MOTION') {
                        row.inMotionLocations.map(async (location) => {
                            if (motionObj.includes(location.eventCode) === true) {
                                locations.push({
                                    eventCode: location.eventCode,
                                    eventDate: location.eventDate,
                                    periodicType: location.periodicType,
                                    coordinates: {
                                        lat: location.lat,
                                        lng: location.lng,
                                    },
                                    state: location.state,
                                    speed: location.speed,
                                    heading: location.heading,
                                    odometer: location.odometer,
                                    engineHours: location.engineHours,
                                    fuelLevel: location.fuelLevel,
                                })
                            }

                        })
                    }

                    if (row.status == 'STATIONARY') {
                        row.stationaryLocations.map(async (station) => {
                            if (stationaryObj.includes(station.eventCode) === true) {
                                stations.push({
                                    eventCode: station.eventCode,
                                    eventDate: station.eventDate,
                                    periodicType: station.periodicType,
                                    coordinates: {
                                        lat: station.lat,
                                        lng: station.lng,
                                    },
                                    state: station.state,
                                    speed: station.speed,
                                    heading: station.heading,
                                    odometer: station.odometer,
                                    engineHours: station.engineHours,
                                    fuelLevel: station.fuelLevel,
                                })
                            }
                        })
                    }
                    var map = new Map(locations.map(o => [o.coordinates.lat, o]))
                    let uniqueLocations = [...map.values()];
                    var map1 = new Map(stations.map(o => [o.coordinates.lat, o]))
                    let uniqueStations = [...map1.values()];;
                    list.push({
                        id: row._id,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : "",
                        vehicleNumber: (row.vehicleId) ? row.vehicleId : "",
                        status: row.status,
                        startTime: (row.startTime) ? row.startTime : "",
                        endTime: (row.endTime) ? row.endTime : "",
                        locations: row.status == "IN_MOTION" ? uniqueLocations : uniqueStations,
                        // allInf: locations
                    })
                })

            }

            let resultData = {
                locationHistory: list
            }
            return list;
        } catch (error) {
            return errorFunction(false, "No list found!")
        }
    }
    function getDriverAggregateList(findCond) {
        return [
            {
                "$match": findCond
            },
            {
                "$group": {
                    "_id": "$driverId",
                    "hasFormErrors": { $first: '$hasFormErrors' },
                    "violations": { $first: '$violations' },
                    "hasViolation": { $first: '$hasViolation' },
                    "lastsync": { $first: '$lastsync' },
                }
            },
            {
                "$lookup": {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driver"
                }
            },
            {
                "$sort": { createdAt: -1 }
            },
            {
                $unwind: '$driver'
            },
            {
                "$project": {
                    _id: 1,
                    count: 1,
                    "driver._id": 1,
                    "driver.firstName": 1,
                    "driver.lastName": 1,
                    "driver.isActive": 1,
                    "hasFormErrors": 1,
                    "hasViolation": 1,
                    "lastsync": 1,
                    fullName: { $concat: ['$driver.firstName', ' ', '$driver.lastName'] }
                }
            },
            {
                "$match": {
                    "driver.isActive": true
                }
            },
        ]
    }
    function getDriverAggregate(findCond, skip, limit) {
        return [
            {
                "$match": findCond
            },
            {
                "$group": {
                    "_id": "$driverId",
                    "hasFormErrors": { $first: '$hasFormErrors' },
                    "violations": { $first: '$violations' },
                    "hasViolation": { $first: '$hasViolation' },
                    "lastsync": { $first: '$lastsync' },
                }
            },
            {
                "$lookup": {
                    from: "drivers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "driver"
                }
            },
            {
                $unwind: '$driver'
            },
            {
                "$sort": { "driver.firstName": 1 }
            },
            {
                "$project": {
                    _id: 1,
                    count: 1,
                    "driver._id": 1,
                    "driver.firstName": 1,
                    "driver.lastName": 1,
                    "driver.isActive": 1,
                    "hasFormErrors": 1,
                    "violations": 1,
                    "trailers": 1,
                    "shippingDocuments": 1,
                    "isCertified": 1,
                    "hasViolation": 1,
                    "lastsync": 1,
                    fullName: { $concat: ['$driver.firstName', ' ', '$driver.lastName'] }
                }
            },
            {
                "$match": {
                    "driver.isActive": true
                }
            },
            { $skip: skip },
            { $limit: limit },
        ]
    }
    return {
        getPortelFindQuery,
        updateUserModel,
        createNewPortal,
        updateDriverModel,
        createNewTuple,
        createStatusObjectAfterNewDriver,
        createLatestDriverStatus,
        updateDriverDailyLogs,
        createLatestVehicleStatus,
        updateExistingVehicle,
        getSuccessVehicleResponse,
        getAllCompanyDetails,
        calculateStatewiseDistance,
        eldAggregation,
        getAllAssetsQueryAggregator,
        getUsersWithCompanyName,
        getDriverHOSAggregateList,
        getDriverHOSAggregate,
        getLastEvent,
        getDailyLogInfo,
        getDailyLogInfoForPDF,
        generateHTML,
        getVehicleLocationHistory,
        getDriverAggregateList,
        getDriverAggregate,
        getViolationInfo
    }
}

module.exports = createQuery;