const mongoose = require("mongoose");
const addFieldsQuery = require("./addFieldsQuery");

const getDriverCSVDetails = (model, payload) => {
    return new Promise(async (resolve , reject) => {
        const driverCSVDetailsQueried = await model.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(payload.id) }
            },
            {
                $lookup: {
                    from: "companies",
                    localField: "companyId",
                    foreignField: "_id",
                    as: "company"
                },
            },
            {
                $lookup: {
                    from: 'dailylogs',
                    let: { "logId": "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $gte: ["$logDate", new Date(payload.startDate)] },
                                        { $lte: ["$logDate", new Date(payload.endDate)] },
                                        { $eq: ["$driverId", "$$logId"] }
                                    ]
                                },
                            },
                        }
                    ],
                    as: "dailyLogsList"
                }
            },
            {
                $lookup: {
                    from: 'vehicles',
                    localField: "assignedVehicleId",
                    foreignField: "_id",
                    as: "vehicleDetail"
                }
            },
            {
                $lookup: {
                    from: 'drivers',
                    localField: 'coDriverId',
                    foreignField: "_id",
                    as: "coDriverDetail"
                }
            },
            {
                $lookup: {
                    from: "latestdriverstatuses",
                    localField: "latestDriverStatusId",
                    foreignField: "_id",
                    as: "latestDriverDetail"
                }
            },
            {
                $lookup: {
                    from: 'dailylogs',
                    localField: "latestDriverDetail.dailyLogId",
                    foreignField: "_id",
                    as: "latestDriverDailyLogsDetial"
                }
            },
            {
                $lookup: {
                    from: 'hosevents',
                    let: { "logId": "$_id" },
                    pipeline: [
                        { $match: { 
                            $expr: {
                                $and: [
                                    { $gte: ["$logDate", new Date(payload.startDate)] },
                                    { $lte: ["$logDate", new Date(payload.endDate)] },
                                    { $eq: ["$driverId", "$$logId"] }
                                    ]
                                }, 
                            }  
                        },
                    ],
                    as: "hosEventDetail"
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: "hosEventDetail.editRequestedByUserId",
                    foreignField: "_id",
                    as: "latestHOSEventEditUserDetail"
                },
            },
            {
                $lookup: {
                    from: "elds",
                    localField: "vehicleDetail.eldId",
                    foreignField: "_id",
                    as: "eldDetail"
                }
            },
     
            { "$unwind": "$hosEventDetail" },
            {
                $addFields: {
                    headerSegment: addFieldsQuery.getHeaderSegment(),
                    eldUnIdentifiedEvent: addFieldsQuery.getUnIdentifiedEventFields(),
                    cmvEnginesPowerUpDownActivity: addFieldsQuery.getCmvEnginesPowerUpDownActiviy(),
                    eldLoginLogoutReport: addFieldsQuery.getEldLoginLogoutReport(),
                    malfunctionAndDiagnosticEvent: addFieldsQuery.getMalfunctionAndDiagnosticEvent(),
                    eldEventListDriverCertificate: addFieldsQuery.getEldEventListDriverCertificate(),
                    eldEventAnnotationsOrComment: addFieldsQuery.getEldEventAnnotationsOrComment(),
                    eldEventList: addFieldsQuery.getEldEventList(),
                    cmvList: addFieldsQuery.getCmvList(),
                    usersList: addFieldsQuery.getUsersList()
                }
            },
            {
                "$project": {
                    "headerSegment": 1,
                    "eldUnIdentifiedEvent": 1,
                    "cmvEnginesPowerUpDownActivity": 1,
                    "eldLoginLogoutReport": 1,
                    "malfunctionAndDiagnosticEvent": 1,
                    "eldEventListDriverCertificate": 1,
                    "eldEventAnnotationsOrComment": 1,
                    "eldEventList": 1,
                    "cmvList": 1,
                    "usersList": 1,
                    "latestHOSEventDetail": 1,
                    "latestHOSEventEditUserDetail": 1,
                    // "eldDetail": 1,
                }
            }
        ]);
        if(driverCSVDetailsQueried.length > 0) resolve(driverCSVDetailsQueried);
        resolve([]);
    })
}

module.exports = getDriverCSVDetails;