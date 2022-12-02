
require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse, ApiResponse } = require("../helper/success");
const { formatDate, msToTime, formatedDate, getLastTwoWeeksDate, checkLogsOvertime, getHOSEventDetails } = require("../helper/utils");
const mongoose = require("mongoose");
const createQuery = require("../helper/createQuery");
const DailyLog = require("../Models/DailyLogModel");
const HOSEvent = require("../Models/HOSEventsModel"); 
const DriverModel = require("../Models/DriverModel");
let skip = 0;
const _ = require("lodash");
const moment = require("moment-timezone");
const LatestDriverStatus = require("../Models/LatestDriverStatusModel");
const promise = require("bluebird");
const POWER_UP = 'ENG_UP_NORMAL';
const Companies = require("../Models/CompanyModel");
let reaminEventCode = ['DR_CERT_1', 'DR_CERT_2', 'DR_CERT_3', 'DR_CERT_4', 'DR_CERT_5', 'DR_CERT_6', 'DR_CERT_7', 'DR_CERT_8', 'DR_CERT_9', 'INTER_NORMAL_PRECISION', 'INTER_REDUCED_PERCISION', 'ENG_UP_NORMAL', 'ENG_UP_REDUCED', 'ENG_DOWN_NORMAL', 'DR_LOGIN', 'DR_LOGOUT', 'ENG_DOWN_REDUCED']

var eventCodeArr = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM']
const shiftTimeAccumulatedTimeEnum = ['DS_ON', 'DS_OFF', 'DS_D', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
const shiftTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
const driveTimeAccumulatedTimeEnum = ['DS_D'];
const driveTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
const cycleTimeAccumulatedTimeEnum = ['DS_ON', 'DS_D', 'DR_IND_YM'];
const cycleTimeAccumulatedRestartTimeEnum = ['DS_OFF', 'DS_SB', 'DR_IND_PC'];
const breakTimeAccumulatedTimeEnum = ['DS_D'];
const breakTimeAccumulatedRestartTimeEnum = ['DS_ON', 'DS_OFF', 'DS_SB', 'DR_IND_PC', 'DR_IND_YM'];
const shiftTimeViolationTimeEnum = ['DS_ON', 'DS_D', 'DR_IND_YM']
const initLogsController = () => {
    const getActiveDrivers = async (req, res) => {
        const { getDriverAggregateList, getDriverAggregate } = createQuery();
        const { page, searchDate, violationStatus, companyId } = req.query;
        let { searchKey } = req.query;
        let { mannerErrors } = req.query;
        try {
            /*CODE FOR TOKEN ENDS*/
            let findCond = { isDeleted: false, companyId: new mongoose.Types.ObjectId(companyId) }
            const limit = parseInt(process.env.WEB_LIMIT)
            if (violationStatus && violationStatus != 'all') {
                findCond.hasViolation = (violationStatus == 'hos_violation') ? true : false
            }
            if (mannerErrors && mannerErrors != 'all') {
                findCond.hasFormErrors = (mannerErrors == 'no_error') ? false : true
            }
            if (searchDate) {
                const { startDateFormatted, endDateFormatted } = formatDate(searchDate)

                findCond.logDate = { $gte: startDateFormatted, $lte: endDateFormatted }
            }

            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            let DriverAggregateList = getDriverAggregateList(findCond);
            if (searchKey) {
                searchKey = new RegExp(searchKey.toLowerCase().trim(), 'i');
                DriverAggregateList.splice(7, 0, { "$match": { "$or": [{ "driver.firstName": searchKey }, { "driver.lastName": searchKey }, { "fullName": searchKey }] } });
            }
            const data = await DailyLog.aggregate(DriverAggregateList).exec();

            const total = data.length;
            if (total == 0) {
                const { statusCode, body } = getSuccessResponse({ drivers: [] }, "No record found", false);
                return res.status(statusCode).send(body);
            }

            let driverAggregate = getDriverAggregate(findCond, skip, limit);

            if (searchKey) {
                // searchKey = new RegExp(searchKey.toLowerCase().trim(), 'i');
                driverAggregate.splice(8, 0, { "$match": { "$or": [{ "driver.firstName": searchKey }, { "driver.lastName": searchKey }, { "fullName": searchKey }] } });
            }
            const driverList = await DailyLog.aggregate(driverAggregate, { collation: { locale: 'en', caseLevel: true } }).exec();
            const count = driverList.length
            let list = []
            if (driverList.length > 0) {
                driverList.map(async row => {
                    let formErrors = [];
                    if (!row.trailers) {
                        formErrors.push({ key: "trailers", value: "Trailer Number Missing" });
                    }
                    if (!row.shippingDocuments)
                        formErrors.push({ key: "shipping_document", value: "Shipping documents Missing" });
                    if (!row.isCertified)
                        formErrors.push({ key: "certification", value: "Certification Missing" });
                    list.push({
                        driverId: row.driver._id,
                        driverName: row.driver.firstName + ' ' + row.driver.lastName,
                        hosViolation: (row.hasViolation) ? row.violations : [],
                        forms_errors: row.hasFormErrors ? formErrors : [],
                        lastSync: row.lastsync
                    })
                })
            }

            //console.log(results)
            var resultData = {
                "drivers": list,
                "totalPages": Math.ceil(total / limit),
                "count": count,
                "totalRecord": total
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Drivers fetched successfully", true);
            return res.status(statusCode).send(body);
        }
        catch (error) {
            console.log(error)
            return res.status(500).json(errorFunction(false, "Could not fetch Driver Details"))
        }
    }
    const getLogsDetails = async (req, res) => {
        const { companyId, violationStatus, mannerErrors, searchDate, page, driverId } = req.query;

        try {

            let findCond = { isDeleted: false, companyId: new mongoose.Types.ObjectId(companyId) }

            const limit = parseInt(process.env.WEB_LIMIT)
            findCond.driverId = driverId

            if (searchDate) {
                let { startDateFormatted, endDateFormatted } = formatDate(searchDate)
                startDateFormatted.setHours(0, 0, 0, 0);
                endDateFormatted.setHours(23, 59, 59, 999);
                findCond.logDate = { $gte: startDateFormatted, $lte: endDateFormatted }
            }
            var searchKey = (searchKey) ? searchKey : ''
            if (violationStatus) {
                findCond.hasViolation = (violationStatus == 'hos_violation') ? true : false
            }
            if (mannerErrors) {
                findCond.hasFormErrors = (mannerErrors == 'no_error') ? false : true
            }

            const total = await DailyLog.countDocuments(findCond);
            if (total == 0) {
                const { statusCode, body } = getSuccessResponse({ logs: [] }, "No record found", false);
                return res.status(statusCode).send(body);
            }
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            let logList = await DailyLog.find(findCond).populate({
                path: 'driverId',
                select: { "firstName": 1, "lastName": 1 }
            }).select({
                "driverId": 1,
                "hasViolation": 1,
                "hasFormErrors": 1,
                "violations": 1,
                "trailers": 1,
                "shippingDocuments": 1,
                "isCertified": 1,
                "timeOnDuty": 1,
                "timeDriven": 1,
                "lastsync": 1,
                "logDate": 1,
            }).limit(limit).skip(skip).sort({ logDate: -1 })

            const count = logList.length
            let logs = []
            if (logList.length > 0) {

                logList = JSON.parse(JSON.stringify(logList));
                logList = await promise.map(logList, async (dailyLog) => {
                    let futureDate = moment(dailyLog.logDate).add(1, 'day').toISOString();
                    let getLatestSyncHosEvent = await HOSEvent.findOne({ isDeleted: false, driverId: dailyLog.driverId, logDate: futureDate, $and: [{ lat: { $ne: "" } }, { lng: { $ne: "" } }] }).sort({ eventDateTime: 1 });

                    let getLastSyncHosEvent = await HOSEvent.findOne({ isDeleted: false, driverId: dailyLog.driverId, logDate: dailyLog.logDate, $and: [{ lat: { $ne: "" } }, { lng: { $ne: "" } }] }).sort({ eventEndDateTime: -1 });
                    if (getLatestSyncHosEvent)
                        dailyLog.latestCoordinates = { lat: getLatestSyncHosEvent.lat, lng: getLatestSyncHosEvent.lng };
                    if (getLastSyncHosEvent)
                        dailyLog.lastCoordinates = { lat: getLastSyncHosEvent.lat, lng: getLastSyncHosEvent.lng }
                    return dailyLog;
                })
                logList.forEach(async (row) => {
                    // console.log("=============",row);
                    let formErrors = [];
                    if (row.trailers && !row.trailers.length)
                        formErrors.push({ key: "trailers", value: "Trailer Number Missing" });
                    if (row.shippingDocuments && !row.shippingDocuments.length)
                        formErrors.push({ key: "shipping_document", value: "Shipping documents Missing" });
                    if (!row.isCertified)
                        formErrors.push({ key: "certification", value: "Certification Missing" });
                    logs.push({
                        id: row._id,
                        driverId: row.driverId._id,
                        driverName: row.driverId.firstName + ' ' + row.driverId.lastName,
                        hosViolation: (row.hasViolation) ? row.violations : [],
                        forms_errors: row.hasFormErrors ? formErrors : [],
                        distance: 0,
                        hoursWorked: (row.timeOnDuty || row.timeDriven) ? msToTime(row.timeOnDuty + row.timeDriven) : 0,
                        lastSync: row.lastsync,
                        logDate: (row.logDate) ? formatedDate(new Date(row.logDate), 1) : '',
                        lastCoordinates: row.lastCoordinates,
                        latestCoordinates: row.latestCoordinates
                    })
                })
            }
            //console.log(logs)
            var resultData = {
                "logs": logs,
                "totalPages": Math.ceil(total / limit),
                "count": count,
                "totalRecord": total
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Logs fetched successfully", true);
            return res.status(statusCode).send(body);
        } catch (error) {
            console.error(error);
            return res.status(500).json(errorFunction(false, "could not get log details"));
        }
    }
    
    const processEvents = async (req, res) => {
        const { driverId, date, id } = req.query;
        try {
            let driverStatus = await LatestDriverStatus.findOne({ driverId: driverId }).select({ "calculatedTimes": 1, "companyId": 1 })
            driverStatus = JSON.parse(JSON.stringify(driverStatus));
            driverStatus.calculatedTimes = _.map(driverStatus.calculatedTimes, (status) => {
                status.accumulatedRestartTime = 0;
                status.accumulatedTime = 0;
                return status;
            })

            if (!driverStatus) {
                const { body } = getSuccessResponse({}, "Driver not found", false);
                return res.status(404).send(body);
            }
            let currentTime = new Date().toISOString();
            let currentLogDate = moment(currentTime).utcOffset(0, false).format("YYYY-MM-DD");
            currentLogDate = new Date(currentLogDate).toISOString();
            let lastTwoWeekLogDates = getLastTwoWeeksDate(currentLogDate);
            let lastTwoWeeksHosEvent = [];
            await promise.map(lastTwoWeekLogDates, async (logDate) => {
                await DailyLog.findOneAndUpdate({ driverId: driverId, logDate: logDate }, { "$set": { "violations": [], "hasViolation": false } })
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
            statusObject = _.orderBy(statusObject, ['startTime']['asc']);
            let driverCalculatedTimes = await updateDriverStatusByLogedEvent(statusObject, driverStatus, driverId)
            const { statusCode, body } = getSuccessResponse(driverCalculatedTimes, "Driver status list", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Something went Wrong!"))
        }
    }
    const editFormTechnician = async (req, res) => {
        const { id } = req.query;
        let { logId, coDriverId, trailers, shippingDocuments, isCertified } = req.body;
        try {
            if (!trailers) trailers = [];
            if (!shippingDocuments) shippingDocuments = [];
            let updObj = {};
            updObj.coDriverId = coDriverId;
            if (!trailers.length)
                updObj.trailers = [];
            else
                updObj.trailers = trailers.split(",");
            if (!shippingDocuments.length)
                updObj.shippingDocuments = [];
            else
                updObj.shippingDocuments = shippingDocuments.split(",");
            updObj.isCertified = isCertified;
            updObj.updatedBy = id;
            let result = await DailyLog.updateOne({ _id: logId }, { $set: updObj }, { new: true })
            if (result.matchedCount > 0) {
                const { statusCode, body } = getSuccessResponse({}, "Form Edited successfully.", true);
                return res.status(statusCode).send(body);
            }
            const { body } = getSuccessResponse({}, "Unable to Form Edit.", false)
            return res.status(500).send(body);
        }
        catch (error) {
            console.log(error)
            return res.status(500).json(errorFunction(false, "Unable to edit form"))
        }
    }
    const removeViolationTechnician = async (req, res) => {
        const { id } = req.params;
        try {
            let editData = await DailyLog.findByIdAndUpdate(id, { "$set": { "violations": [], "hasViolation": false } })
            if (editData) {
                const { statusCode, body } = getSuccessResponse({}, "Violation removed successfully", true);
                return res.status(statusCode).send(body);
            }
            const { body } = getSuccessResponse({}, "Unable to remove Violation", false);
            return res.status(403).send(body);
        }
        catch (error) {
            console.error(error)
            return res.status(500).json(errorFunction(false, "Something went Wrong!"));
        }
    }
    const addEventTechnician = async (req, res) => {
        const {id, companyId } = req.query;
        const { seqId, driverId, logDate, startTime, start_date, driverStatus, certifyDate, origin, state, vehicleId, odometer, engineHours, locSource, positioning, locNote, lat, lng, calcLoc, notes, location } = req.body;
        let {eldId} = req.body;
        try {
            let accumulatedVehicleMiles = 0, elapsedEngineHours = 0;
            const logDated = new Date(logDate)
            if (logDated > new Date()) {
                const { body } = getSuccessResponse({}, "Events can not be created for future date", false)
                return res.status(403).send(body);
            }
            let logFindCond = { isDeleted: false, driverId: driverId, logDate: logDated }
            let latestLog = await DailyLog.findOne(logFindCond).select({ "logDate": 1 })
            if (!latestLog) {
                const {statusCode, body} = getSuccessResponse({}, "No daily log found for this driver", false)
                return res.status(statusCode).send(body);
            }
            let overlapsRes = await checkLogsOvertime({ isDeleted: false, driverId: driverId, logDate: logDated }, start_date)
            if (overlapsRes == false) {
                const {body} = getSuccessResponse({}, "Your event time overlaps with the existing one.", false)
                return res.status(403).send(body);
            }
            if (eldId == "")
                eldId = null;
            let recordObj = {
                createdBy: id,
                updatedBy: id,
                companyId: companyId,
                driverId: driverId,
                vehicleId: vehicleId,
                logId: latestLog._id,
                logDate: logDate,
                eventTime: startTime,
                eventCode: driverStatus,
                eventDateTime: start_date,
                eventStatus: state,
                editRequestedByUserId: id,
                certifiedRecordDate: certifyDate,
                manualLocation: (locNote && positioning == 'manual') ? locNote : '',
                lat: (lat && positioning == 'automatic') ? lat : '',
                lng: (lng && positioning == 'automatic') ? lng : '',
                notes: notes,
                source: locSource,
                positioning: positioning,
                recordOrigin: origin,
                odometer: odometer,
                engineHours: engineHours,
                eldId: eldId,
                calculatedLocation: calcLoc,
                seqId: seqId
            }
            let lastTwoPowerUpEvent = await HOSEvent.find({ driverId: driverId, logDate: { $lte: start_date }, eventCode: POWER_UP }).sort({ eventDate: 1 }).limit(2);
            if (driverStatus === POWER_UP && lastTwoPowerUpEvent && lastTwoPowerUpEvent.length) {
                accumulatedVehicleMiles = +odometer - +lastTwoPowerUpEvent[0].odometer;
                elapsedEngineHours = +engineHours - +lastTwoPowerUpEvent[0].engineHours;
            }
            else if (lastTwoPowerUpEvent && lastTwoPowerUpEvent.length) {
                accumulatedVehicleMiles = lastTwoPowerUpEvent[1] ? +lastTwoPowerUpEvent[1].odometer : 0 - +lastTwoPowerUpEvent[0].odometer;
                elapsedEngineHours = lastTwoPowerUpEvent[1] ? +lastTwoPowerUpEvent[1].engineHours : 0 - +lastTwoPowerUpEvent[0].engineHours;
            }
            recordObj.accumulatedVehicleMiles = Math.abs(accumulatedVehicleMiles);
            recordObj.elapsedEngineHours = Math.abs(elapsedEngineHours);
            let checkLastEvent = await HOSEvent.findOne({ driverId: driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: start_date } }).sort({ eventDateTime: -1 })
            let checkNextEvent = await HOSEvent.findOne({ driverId: driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $gt: start_date } }).sort({ eventDateTime: 1 })
            if (checkLastEvent) await HOSEvent.updateOne({ _id: checkLastEvent._id }, { $set: { eventEndDateTime: start_date } });
            if (checkNextEvent) {
                recordObj.eventEndDateTime = checkNextEvent.eventDateTime;
            }
            let createdEvent = await HOSEvent.create(recordObj);
            let eventInfo = await getHOSEventDetails(createdEvent._id)
            const {statusCode, body} = getSuccessResponse({ eventData: eventInfo }, "Log event added succussfully.", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Events not added"))
        }
    }
    const editEventTechnician = async (req, res) => {
        const {id : userId, companyId} = req.query;
        try {
            const inputData = req.body;
            if(!inputData.id) return res.status(400).json(ApiResponse({}, "Please provde id", false));
            const {id} = req.body;
            let accumulatedVehicleMiles = 0, elapsedEngineHours = 0;
            let eventInfo = await HOSEvent.findById(id)
            if (!eventInfo) return res.status(404).json(ApiResponse({}, "Event does not exist", false))
            
            if (eventInfo.eventStatus != 'ACTIVE') return res.status(405).json(ApiResponse({}, "This record is not editable", false));
            
            let companyDetail = await Companies.findOne({ _id: companyId });
            let companyCurrentTime = moment.tz(moment(new Date()), companyDetail.timeZoneId);
            let eventETCTime = moment.tz(moment(inputData.start_date), companyDetail.timeZoneId);
            if(eventETCTime.isSameOrAfter(companyCurrentTime)) return res.status(403).json(ApiResponse({}, "Time should be less than current time", false));
            let logDate = eventETCTime.format("YYYY-MM-DD");
            if (inputData.eldId == "")
                inputData.eldId = null;
            if(inputData.locNote)
                    inputData.positioning = "manual"
            else
                    inputData.positioning = "automatic"
            let recordObj = {
                companyId: companyId,
                vehicleId: inputData.vehicleId,
                eventDateTime: inputData.start_date,
                eventCode: inputData.driverStatus,
                certifiedRecordDate: inputData.certifyDate,
                manualLocation: (inputData.locNote && inputData.positioning == 'manual') ? inputData.locNote : '',
                lat: (inputData.lat && inputData.positioning == 'automatic') ? inputData.lat : '',
                lng: (inputData.lng && inputData.positioning == 'automatic') ? inputData.lng : '',
                notes: (inputData.notes) ? inputData.notes : '',
                source: inputData.locSource,
                positioning: inputData.positioning,
                recordOrigin: inputData.origin,
                eventStatus: inputData.state,
                odometer: inputData.odometer,
                engineHours: inputData.engineHours,
                eldId: inputData.eldId,
                calculatedLocation: inputData.calcLoc,
                seqId: inputData.seqId,
                editRequestedByUserId: userId,
                suggestedEditEventsId: "hosEvents:" + eventInfo._id,
                updatedAt: new Date(),
            }
    
            let lastTwoPowerUpEvent = await HOSEvent.find({ driverId: inputData.driverId, logDate:{ $lte: inputData.start_date }, eventCode: POWER_UP}).sort({ eventDate: 1 }).limit(2); 
            if(inputData.driverStatus === POWER_UP && lastTwoPowerUpEvent && lastTwoPowerUpEvent.length){
                accumulatedVehicleMiles = +inputData.odometer - +lastTwoPowerUpEvent[0].odometer;
                elapsedEngineHours = +inputData.engineHours - +lastTwoPowerUpEvent[0].engineHours;
            }
            else if(lastTwoPowerUpEvent && lastTwoPowerUpEvent.length){
                accumulatedVehicleMiles = lastTwoPowerUpEvent[1] ? +lastTwoPowerUpEvent[1].odometer : 0 - +lastTwoPowerUpEvent[0].odometer;
                elapsedEngineHours = lastTwoPowerUpEvent[1] ? +lastTwoPowerUpEvent[1].engineHours : 0 - +lastTwoPowerUpEvent[0].engineHours;
            }
            recordObj.accumulatedVehicleMiles = Math.abs(accumulatedVehicleMiles);
            recordObj.elapsedEngineHours = Math.abs(elapsedEngineHours);
    
            if(eventInfo.logDate !== logDate) recordObj.logDate = new Date(logDate).toISOString(); 
            let newEventRow = await HOSEvent.updateOne({ _id: id }, { $set: recordObj });
            let checkLastEvent = await HOSEvent.findOne({ driverId: inputData.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: inputData.start_date } }).sort({ eventDateTime: -1 })
            let checkNextEvent = await HOSEvent.findOne({ driverId: inputData.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $gt: inputData.start_date } }).sort({ eventDateTime: 1 })
            if (checkLastEvent){
                await HOSEvent.updateOne({ _id: checkLastEvent._id }, { $set: { eventEndDateTime: inputData.start_date } });
            } 
            if (checkNextEvent) {
                newEventRow = await HOSEvent.updateOne({ _id: id }, { $set: { eventEndDateTime:  checkNextEvent.eventDateTime } })
            }else{
                newEventRow = await HOSEvent.updateOne({ _id: id }, { $set: { eventEndDateTime:  null } })
            }
            if (!newEventRow.matchedCount) return res.status(403).json(ApiResponse({}, "Unable to update log event information.", false));
            let eventDetails = await getHOSEventDetails(id)
            return res.status(200).ApiResponse({ newRow: eventDetails }, "Log event updated succussfully.", true);
        }
        catch (error) {
            console.log(error);
            return res.status(500).send(ApiResponse(null, "Something went wrong!", false))
        }
    }
    const editBulkTechnician = async (req, res) => {
        const {id, companyId} = req.query;
        const inputData = req.body;
        try {
            let companyDetail = await Companies.findOne({ _id: companyId });
            let getAllEventList = await HOSEvent.find({ _id: { $in: inputData.ids }, eventCode: { $in: [...eventCodeArr, ...reaminEventCode] } });
            
            if (!getAllEventList.length) return res.status(404).ApiResponse({}, "Events not found", false);
            let updateEvent = await promise.map(getAllEventList, async (currentEvent) => {
                if (!currentEvent) return;
                let inputTimeStart, inputTimeEnd, updatedCurrentEvent;
                if (inputData.value < 0) {
                    let value = inputData.value.replace("-", "");
                    inputTimeStart = moment(currentEvent.eventDateTime).subtract(value, inputData.type).toISOString();
                    inputTimeEnd = moment(currentEvent.eventEndDateTime).subtract(value, inputData.type).toISOString();
                } else {
                    inputTimeStart = moment(currentEvent.eventDateTime).add(inputData.value, inputData.type).toISOString();
                    inputTimeEnd = moment(currentEvent.eventEndDateTime).add(inputData.value, inputData.type).toISOString();
                }
    
                let companyCurrentTime = moment.tz(moment(new Date()), companyDetail.timeZoneId);
                let eventETCTime = moment.tz(moment(inputTimeStart), companyDetail.timeZoneId);
                if(eventETCTime.isSameOrAfter(companyCurrentTime)) return;
                
                let logDate = moment.tz(moment(inputTimeStart), companyDetail.timeZoneId).format("YYYY-MM-DD");
                logDate = new Date(logDate).toISOString(); 
                // if(inputData.driverStatus) await HOSEvent.findOneAndUpdate({ _id: currentEvent._id }, { $set: { eventCode: inputData.driverStatus} }, { new: true });
                updatedCurrentEvent = await HOSEvent.findOneAndUpdate({ _id: currentEvent._id }, { $set: { eventDateTime: inputTimeStart, logDate: logDate } }, { new: true });
    
                let getCurrentLastEvent = await HOSEvent.findOne({ driverId: currentEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: inputTimeStart } }).sort({ eventDateTime: -1 })
                let getCurrentNextEvent = await HOSEvent.findOne({ driverId: currentEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $gt: inputTimeStart } }).sort({ eventDateTime: 1 })
                if (getCurrentLastEvent){
                    await HOSEvent.updateOne({ _id: getCurrentLastEvent._id }, { $set: { eventEndDateTime: inputTimeStart } });
                } 
                if (getCurrentNextEvent){
                    // await HOSEvent.updateOne({ _id: getCurrentNextEvent._id }, { $set: { eventDateTime: inputTimeEnd } });
                    updatedCurrentEvent = await HOSEvent.findOneAndUpdate({ _id: currentEvent._id }, { $set: {  logDate: logDate, eventEndDateTime: getCurrentNextEvent.eventDateTime } }, { new: true });
                }else{
                    updatedCurrentEvent = await HOSEvent.findOneAndUpdate({ _id: currentEvent._id }, { $set: { logDate: logDate, eventEndDateTime: null } }, { new: true });
                } 
                return updatedCurrentEvent;
            })
            return res.status(200).json(ApiResponse({ updatedCount: updateEvent.length }, "Edited event successfully", true));
        }
        
        catch (error) {
            console.log(error)
            return res.status(500).json(ApiResponse({updatedCount : null}, "Something went wrong", false));
        }
    }
    const reassignEventTechnician = async (req, res) => {
        const inputData = req.body;
        try {
            const logDate = new Date(inputData.logDate);
            let logDetails = await DailyLog.findOne({ driverId: inputData.driverId, logDate: logDate })
            if (!logDetails) {
                return res.status(404).json(ApiResponse({}, "Log does not exist.", false));
            }
            const logId = logDetails._id
            let updateEvent = await promise.map(inputData.ids, async (id) => {
                let oldEvent = await HOSEvent.findOne({ _id: id, isDeleted: false });
                let checkLastOldEvent = await HOSEvent.findOne({ driverId: oldEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: oldEvent.eventDateTime } }).sort({ eventDateTime: -1 })
                if (checkLastOldEvent) await HOSEvent.findOneAndUpdate({ _id: checkLastOldEvent._id }, { $set: { eventEndDateTime: oldEvent.eventEndDateTime } }, { new: true })
                let updatedEvent = await HOSEvent.findOneAndUpdate({ _id: id }, { $set: { driverId: inputData.driverId, logId: logId } }, { new: true });
                let checkLastEvent = await HOSEvent.findOne({ driverId: updatedEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: updatedEvent.eventDateTime } }).sort({ eventDateTime: -1 })
                let checkNextEvent = await HOSEvent.findOne({ driverId: updatedEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $gt: updatedEvent.eventDateTime } }).sort({ eventDateTime: 1 })
                if (checkLastEvent) await HOSEvent.updateOne({ _id: checkLastEvent._id }, { $set: { eventEndDateTime: updatedEvent.eventDateTime } });
                if (checkNextEvent) {
                    await HOSEvent.updateOne({ _id: id }, { $set: { eventEndDateTime: checkNextEvent.eventDateTime } });
                }
                return updatedEvent;
            })
            return res.status(200).json(ApiResponse({}, "Driver assigned successfully", true));
        }
        catch (error) {
            console.log(error);
            return res.status(500).json(ApiResponse({}, "Something went Wrong!"), false);
        }
    }
    const removeEventTechnician = async (req, res) => {
        const inputData = req.body;
        try {
            if (!inputData.ids.length) return res.status(400).json(ApiResponse({}, "Please provide ids", false));
            let updateEvent = await promise.map(inputData.ids, async (id) => {
                let updatedEvent = await HOSEvent.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true } }, { new: true });
                let checkLastEvent = await HOSEvent.findOne({ driverId: updatedEvent.driverId, isDeleted: false, eventCode: { $in: eventCodeArr }, eventDateTime: { $lt: updatedEvent.eventDateTime } }).sort({ eventDateTime: -1 })
                if (checkLastEvent) await HOSEvent.updateOne({ _id: checkLastEvent._id }, { $set: { eventEndDateTime: updatedEvent.eventEndDateTime } });
                return updatedEvent;
            })
            return res.status(200).json(ApiResponse({}, "Logs deleted successfully", true));
        }
        catch (error) {
            console.log(error);
            return res.status(500).json(ApiResponse({}, "Something went wrong!", false));
        }
    }
    return {
        getActiveDrivers, getLogsDetails, processEvents, editFormTechnician, removeViolationTechnician, addEventTechnician, editEventTechnician,editBulkTechnician, reassignEventTechnician, removeEventTechnician
    }

}
async function updateDriverStatusByLogedEvent(driverEventStatusList, driverStatus, driverId) {
    const { getViolationInfo } = createQuery();
    let violationObject = [];
    _.forEach(driverEventStatusList, (statusObject) => {
        driverStatus.calculatedTimes = _.map(driverStatus.calculatedTimes, (statusInfo) => {
            let timeDifference = statusObject.endTime - statusObject.startTime;
            timeDifference = Math.round(timeDifference / 1000);
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
                if (cycleTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
                if (statusInfo.accumulatedRestartTime > statusInfo.restartTime) {
                    statusInfo.accumulatedTime = 0;
                }
            }
            if (statusInfo.type == 'breakTime') {
                if (breakTimeAccumulatedTimeEnum.includes(statusObject.driverStatus)) {
                    statusInfo.accumulatedTime = statusInfo.accumulatedTime + statusObject.timeDifference;
                    statusInfo.accumulatedRestartTime = 0;
                    if (statusInfo.accumulatedTime > statusInfo.limitTime && shiftTimeViolationTimeEnum.includes(statusObject.driverStatus)) {
                        violationObject.push(getViolationInfo(statusInfo, statusObject));
                    }
                }
                if (breakTimeAccumulatedRestartTimeEnum.includes(statusObject.driverStatus))
                    statusInfo.accumulatedRestartTime = statusInfo.accumulatedRestartTime + statusObject.timeDifference;
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
    await promise.map(violationObject, async (violation) => {
        return await DailyLog.updateOne({ driverId: driverId, logDate: violation.logDate }, { $push: { violations: violation }, $set: { hasViolation: true } });
    })
    await LatestDriverStatus.updateOne({ _id: driverStatus._id }, { $set: { calculatedTimes: driverStatus.calculatedTimes } })
    return { timers: driverStatusInfo };
}
module.exports = initLogsController;