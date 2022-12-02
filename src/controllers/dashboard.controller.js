const { getSuccessResponse } = require("../helper/success");
const { formatDate, calculateDriverHOS } = require("../helper/utils");
const LocationHistory = require("../Models/VehicleLocationHistoryModel");
var eventCodeArr = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_YM', 'DR_IND_PC']
var stationaryObj = ['BLE_OFF', 'BLE_ON', 'ENG_OFF', 'ENG_ON'];
var motionObj = ['PERIODIC', 'TRIP_START', 'TRIP_END'];
const LatestVehicleStatus = require("../Models/LatestVehicleStatusModel");
const LatestDriverStatus = require("../Models/LatestDriverStatusModel");
const VehicleModel = require("../Models/VehicleModel")
const DriverModel = require("../Models/DriverModel");
const mongoose = require("mongoose");
const errorFunction = require("../helper/errorFunction");

const initDashboardRouter = () => {
    const getLocationHistory = async (req, res) => {
        const { companyId, searchDate, vehicleId } = req.query;
        try {
            let findCond = {
                vehicleId: vehicleId,
                companyId: companyId,
                isDeleted: false
            }
            if (searchDate) {
                const { startDateFormatted, endDateFormatted } = formatDate(searchDate)
                startDateFormatted.setHours(0, 0, 0, 0);
                endDateFormatted.setHours(23, 59, 59, 999);
                findCond.startTime = { $gte: startDateFormatted, $lte: endDateFormatted }
            }
            let locationList = await LocationHistory.find(findCond).populate({
                path: 'vehicleId',
                select: { "vehicleNumber": 1 }
            });
            let list = []
            if (locationList.length > 0) {
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
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        status: row.status,
                        startTime: (row.startTime) ? row.startTime : "",
                        endTime: (row.endTime) ? row.endTime : "",
                        locations: row.status == "IN_MOTION" ? uniqueLocations : uniqueStations
                    })
                })
            }

            let resultData = {
                locationHistory: list
            }
            const { statusCode, body } = getSuccessResponse(resultData, "Data fetched successfully", true);
            res.status(statusCode).send(body);
        }

        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    const getDashboardStatus = async (req, res) => {
        const { companyId, truckStatus, dutyStatus, orderBy, searchKey } = req.query;
        try {
            let vfindCond = {
                isActive: true,
                isDeleted: false,
                companyId: companyId,
                status: { $ne: 'INACTIVE' }
            }
            let dfindCond = {
                isActive: true,
                isDeleted: false,
                companyId: companyId,
                currentStatus: { $in: eventCodeArr }
            }
            if (truckStatus) {
                vfindCond.status = truckStatus
            }
            if (dutyStatus) {
                dfindCond.currentStatus = dutyStatus
            }
            let vList = []
            let vehicleList = await LatestVehicleStatus.find(vfindCond).populate({
                path: 'vehicleId',
                select: { "vehicleNumber": 1, "vin": 1, "fuelType": 1, "updatedAt": 1 },
            }).populate({
                path: 'driverId',
                populate: {
                    path: 'latestDriverStatusId',
                    populate: {
                        path: 'coDriverId',
                        populate: {
                            path: 'latestDriverStatusId',
                            select: { "currentStatus": 1 }
                        },
                        select: { "firstName": 1, "lastName": 1 }
                    },
                    select: { "calculatedLocation": 1, "coDriverId": 1 }
                },
                select: { "firstName": 1, "lastName": 1 }
            }).sort({ "vehicleId.updatedAt": orderBy })
            if (vehicleList.length > 0) {
                vehicleList = vehicleList.reduce((acc, user) => {
                    if (!acc.find(u => u.vehicleId._id === user.vehicleId._id)) {
                        acc.push(user)
                    }
                    return acc
                }, [])
            }
            if (vehicleList.length > 0) {
                vehicleList.map((row) => {
                    vList.push({
                        id: row._id,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : "",
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        vehicleStatus: row.status,
                        fuelType: (row.vehicleId) ? row.vehicleId.fuelType : "",
                        driverId: (row.driverId) ? row.driverId._id : '',
                        driverName: (row.driverId) ? row.driverId.firstName + ' ' + row.driverId.lastName : "",
                        coDriverId: (row.driverId) ? (row.driverId.latestDriverStatusId && row.driverId.latestDriverStatusId.coDriverId) ? row.driverId.latestDriverStatusId.coDriverId._id : "" : "",
                        coDriverName: (row.driverId) ? (row.driverId.latestDriverStatusId && row.driverId.latestDriverStatusId.coDriverId) ? row.driverId.latestDriverStatusId.coDriverId.firstName + ' ' + row.driverId.latestDriverStatusId.coDriverId.lastName : "" : "",
                        coDriverEventCode: (row.driverId) ? (row.driverId.latestDriverStatusId && row.driverId.latestDriverStatusId.coDriverId) ? row.driverId.latestDriverStatusId.coDriverId.latestDriverStatusId.currentStatus : "" : "",
                        odometer: row.odometer,
                        fuelLevel: row.fuelLevel,
                        speed: row.speed,
                        online: row.online,
                        timestamp: row.timestamp,
                        eventCode: row.eventCode,
                        location: row.location,
                        state: row.state,
                        heading: row.heading,
                        coordinates: (row.lat) ? { lat: parseFloat(row.lat), lng: parseFloat(row.lng) } : ""
                    })
                })
            }

            if (searchKey && vList.length > 0)
                vList = vList.filter(function (e) {
                    return e.vehicleNumber === searchKey || e.driverName === searchKey;
                });

            let dList = []
            let driverList = await LatestDriverStatus.find(dfindCond).populate({
                path: 'vehicleId',
                populate: {
                    path: 'latestVehicleStatusId',
                    select: { "lat": 1, "lng": 1, "odometer": 1, "heading": 1, "speed": 1, "engineHours": 1, "fuelLevel": 1, "online": 1 }
                },
                select: { "vehicleNumber": 1, "vin": 1, "fuelType": 1 }
            }).populate({
                path: 'driverId',
                populate: {
                    path: 'latestDriverStatusId',
                    select: { "currentStatus": 1, "coDriverId": 1, "lat": 1, "lng": 1 }
                },
                select: { "firstName": 1, "lastName": 1 }
            }).sort({ updatedAt: orderBy })
            if (driverList.length > 0) {
                driverList.map((row) => {
                    var times = calculateDriverHOS(row.calculatedTimes)
                    dList.push({
                        id: row._id,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : "",
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        fuelType: (row.vehicleId) ? row.vehicleId.fuelType : "",
                        driverId: (row.driverId) ? row.driverId._id : "",
                        driverName: (row.driverId) ? row.driverId.firstName + ' ' + row.driverId.lastName : "",
                        coDriverName: "",
                        times: times,
                        eventCode: (row.driverId) ? (row.driverId.latestDriverStatusId) ? row.driverId.latestDriverStatusId.currentStatus : "" : "",
                        odometer: (row.vehicleId) ? row.vehicleId.latestVehicleStatusId ? row.vehicleId.latestVehicleStatusId.odometer : "0" : "0",
                        fuelLevel: (row.vehicleId) ? row.vehicleId.latestVehicleStatusId ? row.vehicleId.latestVehicleStatusId.fuelLevel : "0" : "0",
                        speed: (row.vehicleId) ? row.vehicleId.latestVehicleStatusId ? row.vehicleId.latestVehicleStatusId.speed : "0" : "0",
                        state: (row.vehicleId) ? row.vehicleId.latestVehicleStatusId ? row.vehicleId.latestVehicleStatusId.state : "0" : "0",
                        coordinates: (row.driverId) ? {
                            lat: (row.driverId) ? parseFloat(row.driverId.latestDriverStatusId.lat) : "",
                            lng: (row.driverId) ? parseFloat(row.driverId.latestDriverStatusId.lng) : "",
                        } : "",
                        eld_connection: row.ELDConnected
                    })
                })
            }
            if (searchKey && dList.length > 0)
                dList = dList.filter(function (e) {
                    return e.vehicleNumber === searchKey || e.driverName === searchKey;
                });
            var resultData = {
                "vehicles": vList,
                "drivers": dList,
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Data fetched successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "records not fetched"))
        }
    }
    const getCounts = async (req, res) => {
        const { id, companyId } = req.query;
        try {
            let findCond = { isDeleted: false, companyId: new mongoose.Types.ObjectId(companyId), currentStatus: { $in: eventCodeArr } }
            let stats = await LatestDriverStatus.aggregate([
                {
                    "$match": findCond
                },
                {
                    "$group": {
                        "_id": "$currentStatus",
                        "count": { "$sum": 1 }
                        //"totalDuration": { $sum: { $multiply: [ "$duration" ] } }
                    }
                },
                { 
                    "$sort": { currentStatus: 1 }
                },
                { 
                    "$project": { 
                        _id: 1,
                        count: 1
                    } 
                }
            ]).exec();
            let driverCounts = []
            let existingStatus = []
            
            if(stats.length > 0){
                stats.map((row)=>{
                    existingStatus.push(row._id)
                    driverCounts.push({
                        status:row._id,
                        count:row.count
                    })
                })
                eventCodeArr.map((sRow)=>{
                    if(existingStatus.includes(sRow) === false){
                        driverCounts.push({
                            status:sRow,
                            count:0
                        })
                    }
                })
            }else{
                eventCodeArr.map((sRow)=>{
                    driverCounts.push({
                        status:sRow,
                        count:0
                    })
                })
            }
            const totalDriver = await DriverModel.countDocuments( { isDeleted:false,companyId:companyId, isActive: true });
            let driverStat = {
                DS_D:0,
                DS_SB:0,
                DS_ON:0,
                DS_OFF:0,
                DR_IND_PC:0,
                DR_IND_YM:0,
                totalDrivers: totalDriver
            }
            driverCounts.map((e)=>{
                switch(e.status) {
                    case "DS_D":
                        driverStat.DS_D = e.count
                        break;
                    case "DS_SB":
                        driverStat.DS_SB = e.count
                        break;
                    case "DS_ON":
                        driverStat.DS_ON = e.count
                        break;
                    case "DS_OFF":
                        driverStat.DS_OFF = e.count
                        break;
                    case "DR_IND_PC":
                        driverStat.DR_IND_PC = e.count
                        break;
                    case "DR_IND_YM":
                        driverStat.DR_IND_YM = e.count
                        break;
                    default:
                        driverStat.DR_IND_YM = 0
                }
            })
            //console.log(driverStat)
            //vehicle counts
            let vStatusArr = ['IN_MOTION','STATIONARY','INACTIVE']
            let vehicleCounts = []
            let existingVehicleStatus = []
            let vStats = await LatestVehicleStatus.aggregate([
                {
                    "$match": {isDeleted:false,companyId:new mongoose.Types.ObjectId(companyId),isActive:true}
                },
                {
                    "$group": {
                        "_id": "$status",
                        "count": { "$sum": 1 }
                        //"totalDuration": { $sum: { $multiply: [ "$duration" ] } }
                    }
                },
                { 
                    "$project": { 
                        _id: 1,
                        count: 1
                    } 
                }
            ]).exec();
            if(vStats.length > 0){
                vStats.map((row)=>{
                    existingVehicleStatus.push(row._id)
                    vehicleCounts.push({
                        status:row._id,
                        count:row.count
                    })
                })
                vStatusArr.map((sRow)=>{
                    if(existingVehicleStatus.includes(sRow) === false){
                        vehicleCounts.push({
                            status:sRow,
                            count:0
                        })
                    }
                })
            }else{
                vStatusArr.map((sRow)=>{
                    vehicleCounts.push({
                        status:sRow,
                        count:0
                    })
                })
            }
            if(vehicleCounts.length > 0){
                const firstEle = vehicleCounts[0]
                vehicleCounts.shift()
                vehicleCounts.push(firstEle)
            }
            const totalVehicles = await VehicleModel.countDocuments({is_deleted:false,companyId: companyId, isActive: true });
            let vehicleStat = {
                IN_MOTION:0,
                STATIONARY:0,
                INACTIVE:0,
                totalVehicles: totalVehicles
            }
            vehicleCounts.map((e)=>{
                switch(e.status) {
                    case "IN_MOTION":
                        vehicleStat.IN_MOTION = e.count
                        break;
                    case "STATIONARY":
                        vehicleStat.STATIONARY = e.count
                        break;
                    case "INACTIVE":
                        vehicleStat.INACTIVE = e.count
                        break;
                    default:
                        vehicleStat.INACTIVE = 0
                }
            })
            const {statusCode, body } = getSuccessResponse({drivers:driverStat, vehicles:vehicleStat},"Statistics fetched successfully",true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Records not fetched"))
        }
    }
    return {
        getLocationHistory,
        getDashboardStatus,
        getCounts
    }
}
module.exports = initDashboardRouter;