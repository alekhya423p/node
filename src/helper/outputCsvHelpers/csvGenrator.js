'use strict';

const promise = require("bluebird");
var fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const dir = __dirname + `/reports`;
const csvHeaderData = require('./csvHeaders');
const dataCalculation = require('./fieldsCalculation');
const moment = require('moment-timezone');
const _ = require("lodash");
const fmcsaWebAPI = require("./fmcsaWebAPI");
const eventDataCheckValue = "11000011";
const lineDataCheckValue = "10010110";
var crypto = require('crypto');
const os = require("os");
// get temp directory
const tempDir = os.tmpdir()
const path = require("path");
// if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir);
// }


const outputFileCertificateEventCode = {
    DR_CERT_1: 1, DR_CERT_2: 2, DR_CERT_3: 3, DR_CERT_4: 4,
    DR_CERT_5: 5, DR_CERT_6: 6, DR_CERT_7: 7, DR_CERT_8: 8, DR_CERT_9: 9
}

const eldEventCode = {
    DS_OFF: 1, DS_SB: 2, DS_D: 3,
    DS_ON: 4, DS_WT: 1,
    INTER_NORMAL_PRECISION: 1,
    INTER_REDUCED_PERCISION: 2
}

const eldFileEventType = {
    DS_OFF: 1, DS_SB: 1,
    DS_D: 1, DS_ON: 1, DS_WT: 1,
    INTER_NORMAL_PRECISION: 2,
    INTER_REDUCED_PERCISION: 2,
}

const malFunctionEventType = {
    ELD_MALF: 7, ELD_MALF_CLEARED: 7,
    ELD_DIAG: 7, ELD_DIAG_CLEARED: 7
}

const malFunctionEventCode = {
    ELD_MALF: 1, ELD_MALF_CLEARED: 2,
    ELD_DIAG: 3, ELD_DIAG_CLEARED: 4
}

const loginLogoutEventType = {
    DR_LOGIN: 5, DR_LOGOUT: 5,
}

const loginLogoutEventCode = {
    DR_LOGIN: 1, DR_LOGOUT: 2,
}


const engineEventType = {
    ENG_UP_NORMAL: 6, ENG_UP_REDUCED: 6,
    ENG_DOWN_NORMAL: 6, ENG_DOWN_REDUCED: 6
}

const engineEventCode = {
    ENG_UP_NORMAL: 1, ENG_UP_REDUCED: 2,
    ENG_DOWN_NORMAL: 3, ENG_DOWN_REDUCED: 4,
}

const outputFileRecordOrigin = {
    AUTO: 1,
    DRIVER: 2,
    OTHER_USER: 3,
    UNIDENTIFIED_DRIVER: 4,
}


const outputFileEventStatus = {
    ACTIVE: 1, INACTIVE_CHANGED: 2, INACTIVE_CHANGE_REQUESTED: 3, INACTIVE_CHANGE_REJECTED: 4,
}

const malfunctionDagnosticCode = { ELD_MALF: 1, ELD_MALF_CLEARED: 2, ELD_DIAG: 3, ELD_DIAG_CLEARED: 4 }

module.exports.outputFileCsvGenerator = outputFileCsvGenerator;


async function outputFileCsvGenerator(driversCsvDetails, body) {
    if (driversCsvDetails && !driversCsvDetails.length) return [];
    // return getSuccessResponse(driversCsvDetails, `Output file generated successfully`, true);
    let latestDriverCsvDetail = _.orderBy(driversCsvDetails, ['eldEventList.eventDateTime'], ['desc'])[0];
    let cmvListSegment = getCMVListSegmentWithLineDataCheck(latestDriverCsvDetail.cmvList);
    let usersListSegment = getUserListWithLineDataCheck(latestDriverCsvDetail.usersList, latestDriverCsvDetail.eldEventList);
    let userName = latestDriverCsvDetail.usersList && latestDriverCsvDetail.usersList.firstName.toUpperCase();
    driversCsvDetails = manupulateDriverCSVDetail(driversCsvDetails, latestDriverCsvDetail);
    let headerSegmentData = getHeaderSegmentData(latestDriverCsvDetail.headerSegment, latestDriverCsvDetail.eldEventList, body);
    let unIdentifiedEvents = _.map(driversCsvDetails, (csvDetails) => csvDetails.eldUnIdentifiedEvent);
    let cmvEnginesPowerUpDownActivitySegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.cmvEnginesPowerUpDownActivity);
    let eldLoginLogoutReportSegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.eldLoginLogoutReport);
    let malfunctionAndDiagnosticEventSegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.malfunctionAndDiagnosticEvent);
    let eldEventListDriverCertificateSegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.eldEventListDriverCertificate);
    let eldEventAnnotationsOrCommentSegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.eldEventAnnotationsOrComment);
    let eldEventListSegment = _.map(driversCsvDetails, (csvDetails) => csvDetails.eldEventList);
    let singleSegments = { cmvListSegment, usersListSegment, headerSegmentData }
    let fileDataCheckValue = dataCalculation.calculateFileDataCheckValue(driversCsvDetails, singleSegments);
    let timeStamp = new Date().getTime();
    timeStamp = timeStamp.toString().split("").reverse().join("").slice(0, 10)
    const fileName = `${userName}_${timeStamp}-0000000.csv`;
    // const path = `${tempDir}/${fileName}`
    const filePath =  path.join(tempDir, fileName);
    
    const csvWriter = createCsvWriter({
        path: filePath
    });
    
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "ELD File Header Segment:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createDriverLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.driverLine());
    csvWriter.csvStringifier.header = csvHeaderData.createCoDriverLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.coDriverLine());
    csvWriter.csvStringifier.header = csvHeaderData.createPowerLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.powerUnitLine());
    csvWriter.csvStringifier.header = csvHeaderData.carierLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.carierLine());
    csvWriter.csvStringifier.header = csvHeaderData.shippingLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.shippingLine());
    csvWriter.csvStringifier.header = csvHeaderData.timeplaceLineSegmentHeader();
    await csvWriter.writeRecords(headerSegmentData.timeplaceLine());
    csvWriter.csvStringifier.header = csvHeaderData.eldIDLineSegmentHeader();
    const eldLineHeaderSegment = headerSegmentData.eldIDLine();
    await csvWriter.writeRecords(eldLineHeaderSegment);

    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "User List:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createUsersListHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(usersListSegment);

    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "CMV List:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createCmvListHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(cmvListSegment);

    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "ELD Event List:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createEldEventListHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(eldEventListSegment);


    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "ELD Event Annotations or Comments:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createEldEventAnnotationsOrCommentHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(eldEventAnnotationsOrCommentSegment);

    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "Driver's Certification/Recertification Actions:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createEldEventListDriverCertificateHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(eldEventListDriverCertificateSegment);

    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "Malfunctions and Data Diagnostic Events:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createMalfunctionAndDiagnosticEventHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(malfunctionAndDiagnosticEventSegment);

    // await csvWriter.writeRecords([]);
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "ELD Login/Logout Report:" }]);
    csvWriter.csvStringifier.header = csvHeaderData.createEldLoginLogoutReportHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(eldLoginLogoutReportSegment);

    // await csvWriter.writeRecords([])
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "CMV Engine Power-Up and Shut Down Activity:" }])
    csvWriter.csvStringifier.header = csvHeaderData.createCmvEnginesPowerUpDownActivityHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(cmvEnginesPowerUpDownActivitySegment);

    // await csvWriter.writeRecords([])
    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "Unidentified Driver Profile Records:" }])
    csvWriter.csvStringifier.header = csvHeaderData.createUnidentifiedEventHeader();
    if (body.headerRequired) await csvWriter.writeRecords(getHeaderNamesList(csvWriter.csvStringifier.header));
    await csvWriter.writeRecords(unIdentifiedEvents);

    csvWriter.csvStringifier.header = [{ id: "heading" }];
    await csvWriter.writeRecords([{ heading: "End of File:" }])
    await csvWriter.writeRecords(fileDataCheckValue);
    
    return fmcsaWebAPI.validateEldOutputFile(eldLineHeaderSegment[0], fileName, body.type, filePath)
}


function getHeaderSegmentData(headerSegment, latestHOSEventDetail, body) {
    return {
        driverLine: () => {
            let detail = {
                firstName: headerSegment.driverLine && headerSegment.driverLine.firstName.toUpperCase() || "",
                lastName: headerSegment.driverLine && headerSegment.driverLine.lastName.toUpperCase() || "",
                userName: headerSegment.driverLine && headerSegment.driverLine.userName.toUpperCase() || "",
                licenseState: headerSegment.driverLine.licenseState || "",
                licenseNumber: headerSegment.driverLine.licenseNumber || "",
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
        coDriverLine: () => {
            let detail = {
                coDriverLastName: headerSegment.coDriverLine.coDriverLastName.length && headerSegment.coDriverLine.coDriverLastName[0].toUpperCase() || "",
                coDriverFirstName: headerSegment.coDriverLine.coDriverLastName.length && headerSegment.coDriverLine.coDriverFirstName[0].toUpperCase() || "",
                coDriverUserName: headerSegment.coDriverLine.coDriverLastName.length && headerSegment.coDriverLine.coDriverUserName[0].toUpperCase() || "",
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
        powerUnitLine: () => {
            let detail = {
                vehicleNumber: headerSegment.powerUnitLine && headerSegment.powerUnitLine.vehicleNumber.length && headerSegment.powerUnitLine.vehicleNumber[0].toUpperCase() || "",
                vin: headerSegment.powerUnitLine && headerSegment.powerUnitLine.vin.length && headerSegment.powerUnitLine.vin[0].toUpperCase() || "",
                trailerNumber: headerSegment.powerUnitLine.trailerNumber[0][0] || "",
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
        carierLine: () => {
            let detail = {
                companyDotNumber: headerSegment.carierLine && headerSegment.carierLine.companyDotNumber[0] || "",
                companyName: headerSegment.carierLine.companyName[0] || "",
                companyMultiDayBasisUsed: 8,
                startingTime: headerSegment.timeplaceLine.currentDate ? moment.tz(moment(headerSegment.timeplaceLine.currentDate), headerSegment.carierLine.companyTimeZoneId[0]).format("HHmmss") : "=\"" + '000000' + "\"",
                companyTimeZoneOffset: calculateTimezoneDiff(headerSegment.carierLine.companyTimeZoneId[0]) || "=\"" + '00' + "\"",
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
        shippingLine: () => {
            let detail = {
                shippingDocuments: headerSegment.shippingLine.shippingDocuments[0][0] || "",
                exemptDriver: headerSegment.shippingLine.exemptDriver[0] || "0",
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
        timeplaceLine: () => {
            let detail = {
                currentDate: headerSegment.timeplaceLine.currentDate ? moment(headerSegment.timeplaceLine.currentDate).format("MMDDYY") : '',
                currentTime: headerSegment.timeplaceLine.currentDate ? moment.tz(moment(headerSegment.timeplaceLine.currentDate), headerSegment.carierLine.companyTimeZoneId[0]).format("HHmmss") : "=\"" + '000000' + "\"",
                currentLat: headerSegment.timeplaceLine.currentLat.length && +headerSegment.timeplaceLine.currentLat[0] > -90.0 && +headerSegment.timeplaceLine.currentLat[0] < 90.0 ? parseFloat(headerSegment.timeplaceLine.currentLat[0]).toFixed(2) : "00.00",
                currentLong: headerSegment.timeplaceLine.currentLong.length && +headerSegment.timeplaceLine.currentLong[0] > -179.9 && +headerSegment.timeplaceLine.currentLong[0] < 180.0 ? parseFloat(headerSegment.timeplaceLine.currentLong[0]).toFixed(2) : "00.00",
                accumulatedVehicleMiles: latestHOSEventDetail.accumulatedVehicleMiles ? Math.round(+latestHOSEventDetail.accumulatedVehicleMiles) : 0,
                engineHours: +latestHOSEventDetail.engineHours ? latestHOSEventDetail.engineHours : 0.0,
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];

        },
        eldIDLine: () => {
            let detail = {
                eldRegistrationId: headerSegment.eldIDLine.eldRegistrationId[0] || "SH41",
                eldIdentifier: headerSegment.eldIDLine.eldIdentifier[0] || "LUCID1",
                eldAuthenticationValue: headerSegment.eldIDLine.eldAuthenticationValue[0] || "8a0e271a13b3af07e3da9417265ea9343bb7e0ef336a9e95fec92e666e859f3f",
                outputFileComment: body.comment,
            }
            detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
            return [detail];
        },
    }
}

function getUserListWithLineDataCheck(userDetail, latestHOSEventDetail) {
    let detail = {
        orderNumber: 1,
        eldAccountType: latestHOSEventDetail.editRequestedByUserId ? "S" : "D",
        firstName: userDetail.firstName.toUpperCase() || "",
        lastName: userDetail.lastName.toUpperCase() || "",
    }
    detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
    return [detail];
}

function getCMVListSegmentWithLineDataCheck(cmvDetail) {
    let detail = {
        orderNumber: 1,
        vehicleNumber: cmvDetail.vehicleNumber[0] && cmvDetail.vehicleNumber[0].length && cmvDetail.vehicleNumber[0].toUpperCase() || "",
        vin: cmvDetail.vin[0] && cmvDetail.vin[0].length && cmvDetail.vin[0].toUpperCase() || "",
    }
    detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
    return [detail];
}

function getHeaderNamesList(headingIdArray) {
    let headingObject = {}
    _.forEach(headingIdArray, (heading) => {
        headingObject[heading.id] = heading.title;
    })
    return [headingObject];
}


function manupulateDriverCSVDetail(driversCsvDetails, latestDriverCsvDetail) {
    return _.map(driversCsvDetails, (detail) => {
        detail.eldUnIdentifiedEvent = updateEldUnIdentifiedEventFieldsArray(detail.eldUnIdentifiedEvent);
        detail.cmvEnginesPowerUpDownActivity = updateCmvEnginesPowerUpDownActivityFieldsArray(detail.cmvEnginesPowerUpDownActivity);
        detail.eldLoginLogoutReport = updateEldLoginLogoutReportFieldsArray(detail.eldLoginLogoutReport);
        detail.malfunctionAndDiagnosticEvent = updateMalfunctionAndDiagnosticEventFieldsArray(detail.malfunctionAndDiagnosticEvent);
        detail.eldEventListDriverCertificate = updateEldEventListDriverCertificateFieldsArray(detail.eldEventListDriverCertificate);
        detail.eldEventAnnotationsOrComment = updateEldEventAnnotationsOrCommentFieldsArray(detail.eldEventAnnotationsOrComment, detail.latestHOSEventEditUserDetail, detail.eldEventList);
        detail.eldEventList = updateEldEventListFieldsArray(detail.eldEventList);
        delete detail.cmvList;
        delete detail.usersList;
        return detail;
    })
}

function updateEldEventListDriverCertificateFieldsArray(detail) {
    let detailObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        eventCode: outputFileCertificateEventCode[detail.eventCode] || "1",
        certifiedRecordDate: detail.certifiedRecordDate ? moment(detail.certifiedRecordDate).format("MMDDYY") : moment(detail.logDate).format("MMDDYY"),
        logDate: moment(detail.logDate).format("MMDDYY"),
        eventTime: detail.eventDateTime ? moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"): "=\"" + '000000' + "\"",
        cmvOrderNumber: 1
    }
    detailObject.lineDataCheck = dataCalculation.dataCheckConverstion(detailObject, lineDataCheckValue)
    return detailObject;
}

function updateEldEventListFieldsArray(detail) {
    detail.seqId = dataCalculation.getSeqIdInHexaString(detail.seqId);
    detail.eventStatus = outputFileEventStatus[detail.eventStatus];
    detail.recordOrigin = outputFileRecordOrigin[detail.recordOrigin];
    detail.eventType = eldFileEventType[detail.eventCode] || "1";
    detail.eventCode = eldEventCode[detail.eventCode] || "1";
    detail.logDate = moment(detail.logDate).format("MMDDYY").slice(0, 6);
    detail.eventDateTime = moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss");
    detail.accumulatedVehicleMiles = +detail.accumulatedVehicleMiles && detail.accumulatedVehicleMiles < 9999 ? Math.round(+detail.accumulatedVehicleMiles) : 0;
    detail.lat = detail.lat && +detail.lat > -90.0 && +detail.lat < 90.0 ? parseFloat(detail.lat).toFixed(2) : 0.0;
    detail.lng = detail.lng && +detail.lng > -179.9 && +detail.lng < 180.0 ? parseFloat(detail.lng).toFixed(2) : 0.0;
    detail.elapsedEngineHours = detail.elapsedEngineHours && detail.elapsedEngineHours < 99.9 ? parseFloat(detail.elapsedEngineHours.toFixed(1)) : 0.0;
    detail.distSinceLastValidCoords = +detail.distSinceLastValidCoords > 1 && +detail.distSinceLastValidCoords < 6 ? +detail.distSinceLastValidCoords : 1;
    detail.cmvOrderNumber = 1;
    detail.userOrderNumber = 1;
    detail.malfunctionInsdicatorStatus = detail.malfunctionInsdicatorStatus ? 1 : 0;
    detail.diagnosticIndicatorStatus = detail.diagnosticIndicatorStatus ? 1 : 0;
    detail.eventData = dataCalculation.dataCheckConverstion(detail, eventDataCheckValue);
    detail.lineDataCheck = dataCalculation.dataCheckConverstion(detail, lineDataCheckValue);
    return detail;
}

function updateEldEventAnnotationsOrCommentFieldsArray(detail, editEventUserDetail, eldEventDetail) {
    if(eldEventDetail && eldEventDetail.editRequestedByUserId) {
        let editUser = _.find(editEventUserDetail, (users)=>{ if(users._id == eldEventDetail.editRequestedByUserId) return users; })
        detail.username = editUser && editUser.username;
    }

    let rowObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        userName: detail.userName,
        notes: detail.notes,
        eventDate: moment(detail.eventDateTime).format("MMDDYY").slice(0, 6),
        eventTime: moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"),
        manualLocation: detail.manualLocation && detail.manualLocation.replace(/,/g, "").length >= 5 ? detail.manualLocation.replace(/,/g, "") : "",
    }
    rowObject.lineDataCheck = dataCalculation.dataCheckConverstion(rowObject, lineDataCheckValue);
    return rowObject;
}

function updateMalfunctionAndDiagnosticEventFieldsArray(detail) {
    let rowObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        eventCode: malFunctionEventCode[detail.eventCode] ? malFunctionEventCode[detail.eventCode] : "1",
        malfunctionAndDiagnosticCode: malfunctionDagnosticCode[detail.malfunctionAndDiagnosticCode] ? malfunctionDagnosticCode[detail.malfunctionAndDiagnosticCode] : 1, // Malfunction diagnostic code should be enum 
        logDate: moment(detail.logDate).format("MMDDYY").slice(0, 6),
        eventTime: moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"),
        odometer: detail.odometer ? Math.round(+detail.odometer) : "0",
        engineHours: detail.engineHours ? parseFloat(detail.engineHours).toFixed(2) : 0.0,
        cmvOrderNumber: 1
    }
    rowObject.lineDataCheck = dataCalculation.dataCheckConverstion(rowObject, lineDataCheckValue);
    return rowObject;
}

function updateEldLoginLogoutReportFieldsArray(detail) {
    let rowObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        eventCode: loginLogoutEventCode[detail.eventCode] || "1",
        userName: detail.userName,
        logDate: moment(detail.logDate).format("MMDDYY"),
        eventTime: moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"),
        odometer: detail.odometer ? Math.round(+detail.odometer) : "0",
        engineHours: detail.engineHours ? parseFloat(detail.engineHours).toFixed(2) : 0.0,
    }
    rowObject.lineDataCheck = dataCalculation.dataCheckConverstion(rowObject, lineDataCheckValue);
    return rowObject;
}

function updateCmvEnginesPowerUpDownActivityFieldsArray(detail) {
    let rowObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        eventCode: engineEventCode[detail.eventCode] || "1",
        logDate: moment(detail.logDate).format("MMDDYY"),
        eventTime: moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"),
        odometer: detail.odometer ? Math.round(+detail.odometer) : "0",
        engineHours: detail.engineHours ? parseFloat(detail.engineHours).toFixed(2) : 0.0,
        lat: detail.lat && +detail.lat > -90.0 && +detail.lat < 90.0 ? parseFloat(detail.lat).toFixed(2) : 0.0,
        lng: detail.lng && +detail.lng > -179.9 && +detail.lng < 180.0 ? parseFloat(detail.lng).toFixed(2) : 0.0,
        vehicleNumber: detail.vehicleNumber[0] && detail.vehicleNumber[0].length && detail.vehicleNumber[0].toUpperCase(),
        vin: detail.vin[0] && detail.vin[0].length && detail.vin[0].toUpperCase(),
        latestDriverTrailers: detail.latestDriverTrailers,
        latestDriverShippingDocument: detail.latestDriverShippingDocument,
    }
    rowObject.lineDataCheck = dataCalculation.dataCheckConverstion(rowObject, lineDataCheckValue);
    return rowObject;
}

function updateEldUnIdentifiedEventFieldsArray(detail) {
    let rowObject = {
        seqId: dataCalculation.getSeqIdInHexaString(detail.seqId),
        eventStatus: outputFileEventStatus[detail.eventStatus],
        recordOrigin: outputFileRecordOrigin[detail.recordOrigin],
        eventType: eldFileEventType[detail.eventCode] || "1",
        eventCode: eldEventCode[detail.eventCode] || "1",
        logDate: moment(detail.logDate).format("MMDDYY"),
        eventTime: detail.eventDateTime && moment.tz(moment(detail.eventDateTime), detail.companyTimeZoneId[0]).format("HHmmss"),
        accumulatedVehicleMiles: detail.accumulatedVehicleMiles ? Math.round(+detail.accumulatedVehicleMiles) : 0,
        elapsedEngineHours: detail.elapsedEngineHours ? Math.round(+detail.elapsedEngineHours) : 0,
        lat: detail.lat && +detail.lat > -90.0 && +detail.lat < 90.0 ? parseFloat(detail.lat).toFixed(2) : 0.0,
        lng: detail.lng && +detail.lng > -179.9 && +detail.lng < 180.0 ? parseFloat(detail.lng).toFixed(2) : 0.0,
        distSinceLastValidCoords: +detail.distSinceLastValidCoords > 1 && +detail.distSinceLastValidCoords < 6 ? Math.round(+detail.distSinceLastValidCoords) : 1,
        malfunctionAndDiagnosticCode: malfunctionDagnosticCode[detail.malfunctionAndDiagnosticCode] ? malfunctionDagnosticCode[detail.malfunctionAndDiagnosticCode] : 1,
        cmvOrderNumber: 1
    }
    rowObject.eventDataCheck = dataCalculation.dataCheckConverstion(rowObject, eventDataCheckValue);
    rowObject.lineDataCheck = dataCalculation.dataCheckConverstion(rowObject, lineDataCheckValue);
    return rowObject;
}

function calculateTimezoneDiff(companyTimezone) {
    let currentTimezonTime = moment.tz(moment(), companyTimezone).utcOffset();
    currentTimezonTime = (currentTimezonTime / 60).toString();
    currentTimezonTime = currentTimezonTime.replace('-', '0');
    currentTimezonTime = currentTimezonTime.replace('+', '0');
    return currentTimezonTime;
}

function getLatestHOSEventDetail(hosEventList, latestHOSEventEditUserDetail) {
    hosEventList = _.filter(hosEventList, event => { if (event.eventEndDateTime) return true; })
    let latestEvent = _.orderBy(hosEventList, event => event.eventEndDateTime, 'desc');
    if(latestEvent && latestEvent.length){
        latestEvent[0].editUserDetail = _.find(latestHOSEventEditUserDetail, { _id: latestEvent[0].editRequestedByUserId })
    }
    return latestEvent.length && latestEvent[0];
}


