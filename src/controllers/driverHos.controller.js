require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const mongoose = require("mongoose");
const LatestDriverStatusModel = require("../Models/LatestDriverStatusModel");
const DriversModel= require("../Models/DriverModel");
const { getSuccessResponse } = require("../helper/success");
const createQuery = require("../helper/createQuery");
const { allEventCodes, calculteDistance, checkTimeOverlaps, getHOSEventDetails, getEventCode } = require("../helper/utils");
const UserModel = require("../Models/UserModel");
const DailyLog = require("../Models/DailyLogModel");
const HOSEvent = require("../Models/HOSEventsModel");

const _ = require("lodash");
var eventCodeArr = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM']
const initDriverHosRouter = () => {
    const getHosList = async (req, res) => {
        const { getDriverHOSAggregateList,getDriverHOSAggregate } = createQuery();
        const { companyId, page, searchKey, eldStatus, dutyStatus, id } = req.query;
        let { violationStatus } = req.query;
        try {
            let findCond = { isDeleted: false, companyId: new mongoose.Types.ObjectId(companyId) }
            //if queryString Paramaeters are passed then ith will go further to define status.

            if (violationStatus) violationStatus = violationStatus === "violation_n_errors" ? false : true
            if (dutyStatus) {
                var searchKeyText = new RegExp(dutyStatus, 'i');
                findCond['$or'] = [{ currentStatus: searchKeyText }];
            }


            // console.log("conditon",findCond);
            let driverHosAggregateList = getDriverHOSAggregateList(findCond);

            if (searchKey) {
                searchKey = new RegExp(searchKey, 'i');
                driverHosAggregateList.splice(11, 0, { "$match": { "$or": [{ "driver_info.firstName": searchKey }, { "driver_info.lastName": searchKey }, { "vehicle_info.vehicleNumber": searchKey }] } });
            }
            if (violationStatus) {
                let indexPosition = 8;
                if (searchKey) indexPosition = 9;
                driverHosAggregateList.splice(indexPosition, 0, { "$match": { "logs_info.hasViolation": violationStatus } });
            }

            if (eldStatus) {
                let indexPosition = 6;
                if (searchKey) indexPosition = 7;
                driverHosAggregateList.splice(indexPosition, 0, { "$match": { "vehicle_info.eldConnectionInterface": eldStatus } });
            }
            const allHos = await LatestDriverStatusModel.aggregate(driverHosAggregateList).exec();
            const total = allHos.length;
            if (total == 0) {
                const { body } = getSuccessResponse({ driverhos: [] }, "No record found", false);
                return res.status(200).send(body)
            }
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * process.env.WEB_LIMIT
            }

            let driverHosAggregate = getDriverHOSAggregate(findCond, skip, parseInt(process.env.WEB_LIMIT));


            if (searchKey) {
                driverHosAggregate.splice(11, 0, { "$match": { "$or": [{ "driver_info.firstName": searchKey }, { "driver_info.lastName": searchKey }, { "vehicle_info.vehicleNumber": searchKey }] } });
            }
            if (violationStatus) {
                let indexPosition = 8;
                if (searchKey) indexPosition = 9;
                driverHosAggregate.splice(indexPosition, 0, { "$match": { "logs_info.hasViolation": violationStatus } });
            }

            if (eldStatus) {
                let indexPosition = 6;
                if (searchKey) indexPosition = 7;
                driverHosAggregate.splice(indexPosition, 0, { "$match": { "vehicle_info.eldConnectionInterface": eldStatus } });
            }
            const driverHosList = await LatestDriverStatusModel.aggregate(driverHosAggregate).exec();
            var count = driverHosList.length
            

            let list = [];
            if (driverHosList.length > 0) {
                // var latestlog = '';
                 driverHosList.map(async row => {

                    list.push({
                        id: row.id,
                        displayId: row.displayId,
                        driverId: row.driverId,
                        currentStatus: row.currentStatus,
                        cycleTimeAvailableTomorrow: row.cycleTimeAvailableTomorrow,
                        calculatedTimes: row.calculatedTimes,
                        vehicleNumber: (row.vehicle_info) ? row.vehicle_info.vehicleNumber : "",
                        eldConnectionInterface: (row.vehicle_info) ? row.vehicle_info.eldConnectionInterface : "",
                        driver: (row.driver_info) ? row.driver_info.firstName + " " + row.driver_info.lastName : "",
                        violation: (row.logs_info) ? row.logs_info.hasViolation : "",
                        lastSync: (row.logs_info) ? row.logs_info.lastsync : new Date(),
                        date: (row.logs_info) ? row.logs_info.logDate : "",
                        currentDate: row.createdAt
                    })
                })
            }
            var resultData = {
                "driverhos": list,
                "totalPages": Math.ceil(total / process.env.WEB_LIMIT),
                "count": count,
                "totalRecord": total
            };
            const {statusCode, body} = getSuccessResponse(resultData, "Driver Hos fetched successfully", true);
            return res.status(statusCode).send(body)
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    const getHOSDriverDetails = async (req, res) => {
        const {companyId} = req.query;
        try{
              let result = await DriversModel.find({isDeleted:false,companyId:companyId,isActive:true}).select({"id":1, "firstName":1,"lastName":1,"createdAt":1});
              let driverList = []
              if(result){
                result.map((row)=>{
                  driverList.push({
                        id:row.id,
                        name:row.firstName+' '+row.lastName
                    })
                })
              }
              const {statusCode, body} = getSuccessResponse({"drivers":driverList},"Drivers fetched successfully",true);
              return res.status(statusCode).send(body);
          }catch(err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Could not find Driver details"))
        }
    }
    const getAllEventCodesController = async (req, res) => {
        try {
            const { statusCode, body } = getSuccessResponse({ "eventCodes": allEventCodes }, "Successful", true)
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    const getResponsibleUsers = async (req, res) => {
        const { companyId } = req.query;
        try {
            let result = await UserModel.find({ companyId: companyId, isDeleted: false }).select({
                "firstName": 1,
                "lastName": 1
            });
            
            let users = []
            if (result) {
                result.map((row) => {
                    users.push({
                        id: row.id,
                        name: row.firstName + ' ' + row.lastName
                    })
                })
                const { statusCode, body } = getSuccessResponse({ responsible_usrs: users }, "Responsible users", true);
                return res.status(statusCode).send(body);
            }
            const { body } = getSuccessResponse({}, "Unable to fetch user list.", false);
            return res.status(404).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Something went Wrong!"))
        }
    }
    const getLogDetail = async (req, res) => {
        const { getLastEvent, getDailyLogInfo } = createQuery();
        const { companyId, id, logDriverId } = req.query;
        let { logDate } = req.query;
        try {
            logDate = new Date(logDate)
            let logDetails = await DailyLog.findOne({ driverId: logDriverId, logDate: logDate })
            if (!logDetails) {
                const { statusCode, body } = getSuccessResponse({}, "Log does not exist.", false);
                return res.status(statusCode).send(body);
            }
            const logId = logDetails._id
            //console.log(logId)
            let findCond = { companyId: new mongoose.Types.ObjectId(companyId), driverId: new mongoose.Types.ObjectId(logDriverId), logDate: logDate, isDeleted: false }
            let eventList = await HOSEvent.find(findCond).populate({
                path: 'driverId',
                select: { "firstName": 1 }
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
            }).select({
                "calculatedLocation": 1,
                "malfunctionInsdicatorStatus": 1,
                "diagnosticIndicatorStatus": 1,
                "malfunctionAndDiagnosticCode": 1,
                "manualLocation": 1,
                "recordOrigin": 1,
                "eventTime": 1,
                "eventDateTime": 1,
                "eventEndDateTime": 1,
                "odometer": 1,
                "engineHours": 1,
                "eventCode": 1,
                "eventStatus": 1,
                "notes": 1,
                "isActive": 1,
                "suggestedEditEventsId": 1,
                "certifiedRecordDate": 1,
                "inspection": 1,
                "isLive": 1,
                "dayLightSavingsTime": 1,
                "logDate": 1, "lat": 1, "lng": 1, "positioning": 1, "source": 1, "createdAt": 1, "updatedAt": 1, "updatedBy": 1, "seqId": 1, "timezone": 1
            }).sort({ eventDateTime: 1 })

            let list = []
            let activeEvents = []

            let graphData = []
            var lastEventTime = ''
            if (eventList.length > 0) {
                eventList.map((row) => {
                    if (eventCodeArr.includes(row.eventCode) === true) {
                        lastEventTime = row.eventDateTime
                    }
                    activeEvents.push({
                        id: row._id,
                        timezone: row.timezone,
                        eventTime: row.eventTime,
                        driverStatus: row.eventCode,
                        isActive: row.isActive,
                        event_code: null,
                        event_type: null,
                        record_status: row.eventStatus,
                        origin_code: row.recordOrigin,
                        client_id: "",
                        status: row.eventCode,
                        start_date: row.eventDateTime,
                        logDate: row.logDate,
                        end_date: (row.eventEndDateTime) ? row.eventEndDateTime : null,
                        address: (row.positioning == "automatic") ? row.calculatedLocation : row.manualLocation,
                        manualLocation: row.manualLocation,
                        calculatedLocation: row.calculatedLocation,
                        note: row.notes,
                        creator: "Driver",
                        coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
                        gps_coordinates: "",
                        fused_coordinates: "",
                        eld_coordinates: "",
                        odometr: (row.odometer) ? row.odometer : "0",
                        engine_hours: (row.engineHours) ? row.engineHours : "0",
                        driver_signature: "",
                        eld_address: (row.eldId) ? row.eldId.serialNumber + "(" + row.eldId.macAddress + ")" : "",
                        malfunction_diagnostic: row.malfunctionAndDiagnosticCode,
                        debug_info: "",
                        delta_distance: "",
                        sequenceId: row.seqId,
                        source: row.source,
                        positioning: row.positioning,
                        malfunction: row.malfunctionInsdicatorStatus,
                        diagnostic: row.diagnosticIndicatorStatus,
                        shipping_document: "",
                        document: "",
                        trailer: "",
                        accessToken: "",
                        is_live: row.isLive,
                        inspection: row.inspection,
                        certify_date: (row.certifiedRecordDate) ? row.certifiedRecordDate : '',
                        is_seen: "",
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        editedById: row.updatedBy,
                        driverId: (row.driverId) ? row.driverId._id : '',
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : '',
                        companyId: row.companyId,
                        eldId: (row.eldId) ? row.eldId._id : '',
                        location: row.calculatedLocation,
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        eventTime: row.eventTime,
                        recordOrigin: row.recordOrigin,
                        totalVehicleMiles: row.totalVehicleMiles,
                        totalEngineHours: row.totalEngineHours,
                        eventCode: row.eventCode,
                        driverStatus: row.eventCode,
                        notes: row.notes,
                        isActive: row.isActive,
                        dayLightSavingsTime: row.dayLightSavingsTime,
                        isEditable: (row.suggestedEditEventsId) ? false : true,
                        userId: (row.createdBy) ? row.createdBy._id : '',
                        userName: (row.createdBy) ? row.createdBy.firstName.concat(" ", row.createdBy.lastName) : '',

                    })
                    list.push({
                        id: row._id,
                        location: row.calculatedLocation,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : "",
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        eventTime: row.eventTime,
                        recordOrigin: row.recordOrigin,
                        totalVehicleMiles: row.totalVehicleMiles,
                        totalEngineHours: row.totalEngineHours,
                        eventCode: row.eventCode,
                        driverStatus: getEventCode(row.eventCode),
                        notes: row.notes,
                        isActive: row.isActive,
                        isEditable: (row.suggestedEditEventsId) ? false : true,
                        userId: (row.createdBy) ? row.createdBy._id : '',
                        userName: (row.createdBy) ? row.createdBy.firstName.concat(" ", row.createdBy.lastName) : '',

                    })
                })
            }
            graphData = activeEvents.filter(e => e.isActive == true)
            let lastLog;
            if (graphData.length) lastLog = await getLastEvent(logDriverId, graphData[0].start_date);
            else lastLog = await getLastEvent(logDriverId, logDate, true);
            if (!_.isEmpty(lastLog)) graphData.unshift(lastLog);
            let logInfo = await getDailyLogInfo(logId, graphData);
            if (!logInfo) {
                const { body } = getSuccessResponse({}, "Invalid log id.", false);
                return res.status(422).send(body);
            }
            let lastLogDetail = await DailyLog.findOne({ driverId: logDriverId, logDate: lastLog.logDate })
            let companyInfo = {
                companyId: logInfo.companyId._id,
                companyName: logInfo.companyId.companyName,
                dotNumber: logInfo.companyId.dotNumber,
                address: logInfo.companyId.address,
                timeZoneId: logInfo.companyId.timeZoneId,
                phone: logInfo.companyId.phoneNumber
            }
            let driverInfo = {
                driverId: logInfo.driverId,
                driverUsername: logInfo.driverUsername,
                driverName: logInfo.driverName,
                homeTerminal: logInfo.homeTerminal,
                exempt: logInfo.exempt,
                licenseNumber: logInfo.licenseNumber,
                licenseState: logInfo.licenseState,
                coDriverId: logInfo.coDriverId,
                coDriverName: logInfo.coDriverName,
                coDriverUsername: logInfo.coDriverUsername,
                cycle: logInfo.cycleRule,
                cargoType: logInfo.cargoType,
                restartHours: logInfo.restartHours,
                restBreak: logInfo.restBreak
            }
            let vehicleInfo = {
                vehicleId: logInfo.vehicleId,
                vehicleNumber: logInfo.vehicleNumber,
                vin: logInfo.vin,
                eldId: logInfo.eldId,
                eldSerialNumber: logInfo.serialNumber,
                eldMacAddress: logInfo.macAddress,
                deviceMalfunction: "",
                deviceDiagnostic: "",
                engineHours: logInfo.engineHours,
                odometr: logInfo.odometer,
                distance: ""
            }
            let timers = {
                date: logInfo.logDate,
                break: logInfo.break,
                drive: logInfo.drive,
                //driving :  logInfo.driving ,
                shift: logInfo.shift,
                cycle: logInfo.cycle,
                recap: "",
                drivingTime: ""
            }
            const { statusCode, body } = getSuccessResponse({
                logId: logInfo.id,
                // events:list,
                offline_logs: [],
                violationRanges: logInfo.violationRanges,
                violations: [{ key: "sign", value: "No Signature!" }],
                warnings: [],
                total_distance: "0",
                worked_hours_today: "0",
                driving_hours_today: "0",
                off_hours_today: "0",
                //timestamp:logInfo.logDate,
                timestamp: new Date(),
                dayLightSavingsTime: logDetails.dayLightSavingsTime,
                trailers: logInfo.trailers,
                shippingDocuments: logInfo.shippingDocuments,
                isCertified: logInfo.isCertified,
                driver: driverInfo,
                vehicle: vehicleInfo,
                timers: timers,
                company: companyInfo,
                //last_log:lastLog,
                logs: graphData,
                shifts: (logInfo.shiftStart) ? [logInfo.shiftStart] : [],
                cycles: (logInfo.cycleStart) ? [logInfo.cycleStart] : []
            }, "log detail.", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went Wrong!"))
        }

    }
    const getReportPDFLogs = async (req, res) => {
        const { getDailyLogInfoForPDF, generateHTML, getLastEvent, getVehicleLocationHistory } = createQuery();
        const { companyId, id, logDriverId, start, end } = req.query;
        let { logDate } = req.query;
        try {


            if (logDate) {
                logDate = new Date(logDate)
            } else if (start && end) {
                logDate = new Date(start)
                date = {
                    $gte: new Date(start),
                    $lte: new Date(end),
                };
            } else {
                const { body } = getSuccessResponse({}, "Please provide log date.", false);
                return res.status(404).send(body);
            }
            let logDetails = await DailyLog.findOne({ driverId: new mongoose.Types.ObjectId(logDriverId) });
            if (!logDetails) {
                const { body } = getSuccessResponse({}, "Log does not exist.", false)
                return res.status(404).send(body);
            }
            const logId = logDetails._id
            let logInfo = await getDailyLogInfoForPDF(logId)

            if (!logInfo) {
                const { body } = getSuccessResponse({}, "Invalid log id", false)
                return res.status(404).send(body);
            }

            let findCond = { companyId: new mongoose.Types.ObjectId(companyId), driverId: new mongoose.Types.ObjectId(logDriverId), logDate: logDate, isDeleted: false }
            let eventList = await HOSEvent.find(findCond).populate({
                path: 'driverId',
                select: { "firstName": 1 }
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
            }).select({
                "calculatedLocation": 1,
                "malfunctionInsdicatorStatus": 1,
                "diagnosticIndicatorStatus": 1,
                "malfunctionAndDiagnosticCode": 1,
                "manualLocation": 1,
                "recordOrigin": 1,
                "eventTime": 1,
                "eventDateTime": 1,
                "eventEndDateTime": 1,
                "odometer": 1,
                "engineHours": 1,
                "eventCode": 1,
                "eventStatus": 1,
                "notes": 1,
                "isActive": 1,
                "suggestedEditEventsId": 1,
                "certifiedRecordDate": 1,
                "inspection": 1,
                "isLive": 1,
                "logDate": 1, "lat": 1, "lng": 1, "positioning": 1, "source": 1, "createdAt": 1, "updatedAt": 1, "updatedBy": 1, "seqId": 1, "timezone": 1
            }).sort({ eventDateTime: 1 });
            let list = []
            let activeEvents = []

            let graphData = []
            var lastEventTime = ''

            if (eventList.length > 0) {
                eventList.map((row) => {
                    if (eventCodeArr.includes(row.eventCode) === true) {
                        lastEventTime = row.eventDateTime
                    }
                    activeEvents.push({
                        id: row._id,
                        timezone: row.timezone,
                        eventTime: row.eventTime,
                        driverStatus: row.eventCode,
                        isActive: row.isActive,
                        event_code: null,
                        event_type: null,
                        record_status: row.eventStatus,
                        origin_code: row.recordOrigin,
                        client_id: "",
                        status: row.eventCode,
                        start_date: row.eventDateTime,
                        logDate: row.logDate,
                        end_date: (row.eventEndDateTime) ? row.eventEndDateTime : null,
                        address: (row.positioning == "automatic") ? row.calculatedLocation : row.manualLocation,
                        manualLocation: row.manualLocation,
                        calculatedLocation: row.calculatedLocation,
                        note: row.notes,
                        creator: "Driver",
                        coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng) },
                        gps_coordinates: "",
                        fused_coordinates: "",
                        eld_coordinates: row.eldId,
                        odometr: (row.odometer) ? row.odometer : "0",
                        engine_hours: (row.engineHours) ? row.engineHours : "0",
                        driver_signature: "",
                        eld_address: (row.eldId) ? row.eldId.serialNumber + "(" + row.eldId.macAddress + ")" : "",
                        malfunction_diagnostic: row.malfunctionAndDiagnosticCode,
                        debug_info: "",
                        delta_distance: "",
                        sequenceId: row.seqId,
                        source: row.source,
                        positioning: row.positioning,
                        malfunction: row.malfunctionInsdicatorStatus,
                        diagnostic: row.diagnosticIndicatorStatus,
                        shipping_document: "",
                        document: "",
                        trailer: "",
                        accessToken: "",
                        is_live: row.isLive,
                        inspection: row.inspection,
                        certify_date: (row.certifiedRecordDate) ? row.certifiedRecordDate : '',
                        is_seen: "",
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        editedById: row.updatedBy,
                        driverId: (row.driverId) ? row.driverId._id : '',
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : '',
                        companyId: row.companyId,
                        eldId: (row.eldId) ? row.eldId._id : '',
                        location: row.calculatedLocation,
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        eventTime: row.eventTime,
                        recordOrigin: row.recordOrigin,
                        totalVehicleMiles: row.totalVehicleMiles,
                        totalEngineHours: row.totalEngineHours,
                        eventCode: row.eventCode,
                        driverStatus: row.eventCode,
                        notes: row.notes,
                        isActive: row.isActive,
                        isEditable: (row.suggestedEditEventsId) ? false : true,
                        userId: (row.createdBy) ? row.createdBy._id : '',
                        userName: (row.createdBy) ? row.createdBy.firstName.concat(" ", row.createdBy.lastName) : '',

                    })
                    list.push({
                        id: row._id,
                        location: row.calculatedLocation,
                        vehicleId: (row.vehicleId) ? row.vehicleId._id : "",
                        vehicleNumber: (row.vehicleId) ? row.vehicleId.vehicleNumber : "",
                        eventTime: row.eventTime,
                        recordOrigin: row.recordOrigin,
                        totalVehicleMiles: row.totalVehicleMiles,
                        totalEngineHours: row.totalEngineHours,
                        eventCode: row.eventCode,
                        driverStatus: getEventCode(row.eventCode),
                        notes: row.notes,
                        isActive: row.isActive,
                        isEditable: (row.suggestedEditEventsId) ? false : true,
                        userId: (row.createdBy) ? row.createdBy._id : '',
                        userName: (row.createdBy) ? row.createdBy.firstName.concat(" ", row.createdBy.lastName) : '',

                    })
                })
            }

            graphData = activeEvents.filter(e => e.isActive == true)
            let lastLog;
            if (graphData.length) lastLog = await getLastEvent(logDriverId, graphData[0].start_date);
            else lastLog = await getLastEvent(logDriverId, logDate);
            graphData.unshift(lastLog);

            let companyInfo = {
                companyId: logInfo.companyId._id,
                companyName: logInfo.companyId.companyName,
                dotNumber: logInfo.companyId.dotNumber,
                address: logInfo.companyId.address,
                timeZoneId: logInfo.companyId.timeZoneId,
                phone: logInfo.companyId.phoneNumber
            }
            let driverInfo = {
                driverId: logInfo.driverId,
                driverUsername: logInfo.driverUsername,
                driverName: logInfo.driverName,
                homeTerminal: logInfo.homeTerminal,
                exempt: logInfo.exempt,
                licenseNumber: logInfo.licenseNumber,
                licenseState: logInfo.licenseState,
                coDriverId: logInfo.coDriverId,
                coDriverName: logInfo.coDriverName,
                cycle: logInfo.cycleRule,
                cargoType: logInfo.cargoType,
                restartHours: logInfo.restartHours,
                restBreak: logInfo.restBreak
            }
            let vehicleInfo = {
                vehicleId: logInfo.vehicleId,
                vehicleNumber: logInfo.vehicleNumber,
                vin: logInfo.vin,
                eldId: logInfo.eldId,
                eldSerialNumber: logInfo.serialNumber,
                eldMacAddress: logInfo.macAddress,
                deviceMalfunction: "",
                deviceDiagnostic: "",
                engineHours: logInfo.engineHours,
                odometr: logInfo.odometer,
                distance: ""
            }
            let timers = {
                date: logInfo.logDate,
                break: logInfo.break,
                drive: logInfo.drive,
                //driving :  logInfo.driving ,
                shift: logInfo.shift,
                cycle: logInfo.cycle,
                recap: "",
                drivingTime: ""
            }

            let allDetails = {
                logId: logInfo.id,
                // events:list,
                offline_logs: [],
                violationRanges: logInfo.violations,
                violations: [{ key: "sign", value: "No Signature!" }],
                warnings: [],
                total_distance: "0",
                worked_hours_today: "0",
                driving_hours_today: "0",
                off_hours_today: "0",
                //timestamp:logInfo.logDate,
                timestamp: new Date(),
                trailers: logInfo.trailers,
                shippingDocuments: logInfo.shippingDocuments,
                isCertified: logInfo.isCertified,
                shifts: (logInfo.shiftStart) ? [logInfo.shiftStart] : [],
                cycles: (logInfo.cycleStart) ? [logInfo.cycleStart] : []
            }
            // console.log(vehicleInfo.vehicleId, companyInfo.companyId)
            let newInfo = await getVehicleLocationHistory(graphData[0].vehicleId, companyInfo.companyId,logDate)
            let updatedArray = []
            if (newInfo && newInfo.length) {
                newInfo.map(async (vals) => {
                    // console.log(vals)
                    if (vals.locations.length) {
                        let rowstart = vals.locations[0]
                        let rowend = vals.locations[vals.locations.length - 1]
                        let distance = await calculteDistance({
                            start_lat: rowstart.coordinates.lat,
                            start_lng: rowstart.coordinates.lng,
                            destination_lat: rowend.coordinates.lat,
                            destination_lng: rowend.coordinates.lng
                        })

                        vals.distance = distance;
                        vals.startplace = rowstart.state;
                        vals.endPlace = rowend.state;
                    }

                    updatedArray.push(vals)
                })
            }
            const html = generateHTML(companyInfo, driverInfo, vehicleInfo, graphData, allDetails, updatedArray)
            const {statusCode, body } = getSuccessResponse({html}, "PDF File uploaded successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Something Went Wrong!"))
        }
    }
    const addEvent = async (req, res) => {
        const {id, companyId} = req.query;
        const {driverId, startTime, userId, vehicleId, driverStatus, location, lat, lng, notes} = req.body;
        let {logDate} = req.body;
        try{
            //find logId of existing log for the provided driver
            logDate = new Date(logDate)
            if(logDate > new Date()){
                const {body} = getSuccessResponse({},"Events can not be created for future date",false)
                return res.status(422).send(body);
            }
            let logFindCond = {isDeleted:false,driverId:driverId,logDate:logDate}
            let latestLog = await DailyLog.findOne(logFindCond).select({"logDate":1})
            if(!latestLog){
                const {body} = getSuccessResponse({},"No daily log found for this driver",false)
                return res.status(422).send(body)
            }
            // let eventData = await HOSEvent.find(logFindCond).select("eventTime");
            // let existingEventTimes = eventData.filter(e=>e.eventTime == startTime)
            // if(existingEventTimes.length > 0)
            //     return getValidationResponse({},"You event Log overlaps with the existing one.",false);
            let overlapsRes = await checkTimeOverlaps({isDeleted:false,driverId:driverId,logDate:logDate}, startTime)
            if(overlapsRes == false){
                const {body} = getSuccessResponse({},"You event time overlaps with the existing one.",false);
                return res.status(422).send(body)
            }
            let recordObj = new HOSEvent({
                createdBy:userId,
                updatedBy:userId, 
                companyId,
                driverId:driverId,
                vehicleId:vehicleId,
                logId:latestLog._id,
                logDate:logDate,
                eventCode:driverStatus,
                eventDateTime:startTime,
                eventStatus:'INACTIVE_CHANGED',
                editRequestedByUserId:userId
            })
            if(location){
                recordObj.manualLocation = location
            }
            if(lat){
                recordObj.lat = lat
            }
            if(lng){
                recordObj.lng = lng
            }
            if(notes){
                recordObj.notes = notes
            }
    
            let checkLastEvent = await HOSEvent.findOne({ driverId: driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: startTime } }).sort({ eventDateTime: -1 })
            let checkNextEvent = await HOSEvent.findOne({driverId: driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $gt: startTime }}).sort({ eventDateTime: 1 })
            if(checkLastEvent) await HOSEvent.updateOne({ _id: checkLastEvent._id }, {$set: { eventEndDateTime: startTime }});
            if(checkNextEvent){
                recordObj.eventEndDateTime = checkNextEvent.eventDateTime;
            } 
            const createdObj = await recordObj.save();
            if(createdObj){
                let eventInfo = await getHOSEventDetails(createdObj._id)
                const {statusCode, body} = getSuccessResponse({eventData:eventInfo},"Log event added succussfully.",true);
                return res.status(statusCode).send(body);
            }

            return res.status(403).json(errorFunction(false, "Unable to update information"))
        }   
        catch(err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Something went wrong!"))
        }
    }
    return {
        getHosList,
        getHOSDriverDetails,
        getAllEventCodesController, getResponsibleUsers, getLogDetail, getReportPDFLogs, addEvent
    }
}

module.exports = initDriverHosRouter;