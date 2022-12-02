require("dotenv").config();
const createQuery = require("../helper/createQuery");
const { getSuccessResponse, ApiResponse } = require("../helper/success");
const { formatDate, getDateWithoutTime, formatedDate, getEventCode } = require("../helper/utils");
const UnidentifiedEvent = require("../Models/UnidentifiedEventsModel");
const HOSEvent= require("../Models/HOSEventsModel");
const _ = require("lodash");
const errorFunction = require("../helper/errorFunction");
const limit = parseInt(process.env.WEB_LIMIT);
let skip = 0;
const initEldEventsController = () => {
    const getAllEvents = async (req, res) => {
        const { eldAggregation } = createQuery();
        const { id, companyId, page, searchKey } = req.query;
        try {
            let findCond = {
                isDeleted: false,
                companyId: companyId
            }
            // if (searchKey) {
            //     const { startDateFormatted, endDateFormatted } = formatDate(searchKey);
            //     startDateFormatted.setHours(0, 0, 0, 0);
            //     endDateFormatted.setHours(23, 59, 59, 999);
            //     findCond.eventTime = { $gte: startDateFormatted, $lte: endDateFormatted }
            // }
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            let allVehicles = await UnidentifiedEvent.aggregate([
                {
                    "$match": findCond
                },
                {
                    "$group": {
                        "_id": "$vehicleId"
                    }
                },
                {
                    "$project": {
                        _id: 1
                    }
                }
            ]).exec();
            const total = allVehicles.length
            if (total == 0) {
                const { statusCode, body } = getSuccessResponse({ vehicles: [] }, "No record found", false);
                return res.status(statusCode).send(body);
            }
            // if records are found
            let eldAggregationQuery = eldAggregation(findCond, skip, limit);
            if (searchKey) {
                searchKey = new RegExp(searchKey, 'i');
                eldAggregationQuery.splice(9, 0, { "$match": { "$or": [{ "vehicle.vehicleNumber": searchKey }, { "eld.serialNumber": searchKey }, { "eld.macAddress": searchKey }] } });
            }
            const vehicleList = await UnidentifiedEvent.aggregate(eldAggregationQuery).exec();
            const count = vehicleList.length
            let list = []
            if (vehicleList.length > 0) {
                vehicleList.map((row) => {
                    list.push({
                        vehicleId: row.vehicle._id,
                        vehicleNumber: row.vehicle.vehicleNumber,
                        vin: row.vehicle.vin,
                        eldSerialNumber: (row.eld) ? row.eld.serialNumber : '',
                        eldMacAddress: (row.eld) ? row.eld.serialNumber : '',
                        eventCount: row.count,
                        eventCode: getEventCode(row.eventCode),
                        unidentifiedTime: "2 hrs 20mints"
                    })
                })
            }
            var resultData = {
                "vehicles": list,
                "totalPages":Math.ceil(total/limit),
                "count": count,
                "totalRecord":total
            };
            const {statusCode, body } = getSuccessResponse(resultData,"Vehicle fetched successfully",true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Records not fetched"));
        }
    }
    const assignDriverEldEvents = async (req, res) => {
        const {id, companyId} = req.query;
        try{
            const inputData = req.body;
            const driverId = inputData.driverId
            let eventList = await UnidentifiedEvent.find({"eldEventsList._id" : { $in:  inputData.eventIds } ,isDeleted:false,companyId:companyId})
            if(eventList.length == 0){
                return res.status(401).json(ApiResponse({},"Events does not exist",false));
            }
            eventList = JSON.parse(JSON.stringify(eventList));
            eventList = _.map(eventList, (event)=>{
                event.saveEldEventsList = _.filter(event.eldEventsList, (eldEvents)=>{
                    if(!inputData.eventIds.includes(eldEvents._id.toString())) return true;
                })
                event.eldEventsList = _.filter(event.eldEventsList, (eldEvents)=>{
                   if(inputData.eventIds.includes(eldEvents._id.toString())) return true;
                })
            return event;
            })
            let events = []
            eventList.map((row)=>{
                let logDate = getDateWithoutTime(row.eldEventsList[0].timestamp);
                events.push({
                    createdBy:id,
                    updatedBy:id, 
                    companyId,
                    driverId:driverId,
                    vehicleId:row.vehicleId,
                    eldId:row.eldId,
                    logDate: logDate,
                    eventTime:row.eldEventsList[0].eventTime,
                    eventCode:row.eldEventsList[0].eventCode,
                    lat:(row.eldEventsList[0].lat) ? row.eldEventsList[0].lat : '',
                    lng:(row.eldEventsList[0].lng) ? row.eldEventsList[0].lng : '',
                    calculatedLocation:(row.eldEventsList[0].calculatedLocation) ? row.eldEventsList[0].calculatedLocation :''
                })
            })
    
            //save a copy of unidentified events to hosevents
            if(events.length > 0){
                let eventRes = await HOSEvent.insertMany(events);
               // console.log(eventRes)
            }
     
            //remove data from unidentified events 
            let updateUnidentifiedEvents = _.map(eventList, (unidentifiedEvent)=>{
                return UnidentifiedEvent.updateOne({_id:unidentifiedEvent._id},{ $set: { eldEventsList: unidentifiedEvent.saveEldEventsList }});
            })
            return Promise.all(updateUnidentifiedEvents)
                .then(async (result)=>{
                    if(result.length) return res.status(200).json(ApiResponse({},"Driver assigned successfully",true));
                    return res.status(403).json(ApiResponse({},"Unable to update event information.",false));
                })
        }catch(error){
            console.log("error-->",error);
            return res.status(500).json(ApiResponse({}, "Something went Wrong!", false));
        }
    }
    const getUnidentifiedEventsEld = async (req, res) => {
        const { id, companyId, vehicleId, page , searchDate  } = req.query;
        
        try{
            /*CODE FOR TOKEN ENDS*/
            let findCond = {isDeleted:false,companyId:companyId}
            
            var skip = 0
            findCond.vehicleId = vehicleId
            if(searchDate){
                let {startDate, endDate} = formatDate(searchDate)
                var start = new Date(startDate);
                start.setHours(0,0,0,0);
                
                var end = new Date(endDate);
                end.setHours(23,59,59,999);
    
                //findCond.eventTime = { $gte: start, $lte: end }
            }
            
            if(page && (page>0)){
                skip = (parseInt(page)-1)*limit
            }
    
            
            let vehicleEvent = await UnidentifiedEvent.findOne(findCond).populate({
                path:'vehicleId',
                select:{"vehicleNumber":1,"vin":1}
            }).populate({
                path:'companyId',
                select:{"timeZoneId":1}
            })
            if(!vehicleEvent) return res.status(404).json(ApiResponse({vehicles:[]},"No events found for this vehicle",false));
            
            //console.log(eventList)
            const count = vehicleEvent.eldEventsList.length
            const total = vehicleEvent.eldEventsList.length
            let list = []
            if(vehicleEvent.eldEventsList.length > 0){
                let eventList = vehicleEvent.eldEventsList
                eventList.map((row)=>{
                    list.push({
                        id:row._id,
                        eventCode:getEventCode(row.eventCode),
                        location:row.calculatedLocation,
                        odometer:row.odometer,
                        engineHours:row.engineHours,
                        //eventTime:(row.timestamp) ? formatedDate(new Date(row.timestamp),4):'',
                        eventTime:(row.timestamp) ? formatedDate(new Date(row.timestamp),2) :"",
                        vehicleNumber:(row.vehicleId) ? row.vehicleId.vehicleNumber :'',
                        timeZone:(row.companyId)? row.companyId.timeZoneId:''
                    })
                })
            }
            var resultData = {
                "vehicles": list,
                "totalPages":Math.ceil(total/limit),
                "count": count,
                "totalRecord":total
            };
            return res.status(200).json(ApiResponse(resultData,"Unidentified events fetched successfully",true));
        }catch(error){
            console.error(error);
            return res.status(500).json(ApiResponse({}, "something went wrong!", false));
        }
    }
    return {
        getAllEvents,assignDriverEldEvents, getUnidentifiedEventsEld
    }
}

module.exports = initEldEventsController;