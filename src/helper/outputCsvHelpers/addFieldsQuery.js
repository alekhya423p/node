module.exports.getHeaderSegment = getHeaderSegment;
module.exports.getUnIdentifiedEventFields = getUnIdentifiedEventFields;
module.exports.getCmvEnginesPowerUpDownActiviy = getCmvEnginesPowerUpDownActiviy;
module.exports.getEldLoginLogoutReport = getEldLoginLogoutReport;
module.exports.getMalfunctionAndDiagnosticEvent = getMalfunctionAndDiagnosticEvent;
module.exports.getEldEventListDriverCertificate = getEldEventListDriverCertificate;
module.exports.getEldEventAnnotationsOrComment = getEldEventAnnotationsOrComment;
module.exports.getEldEventList = getEldEventList;
module.exports.getCmvList = getCmvList;
module.exports.getUsersList = getUsersList;

function getHeaderSegment() {
    return {
        driverLine: {
            firstName: "$firstName",
            lastName: "$lastName",
            userName: "$userName",
            licenseState: "$licenseState",
            licenseNumber: "$licenseNumber",
        },
        coDriverLine: {
            coDriverLastName: "$coDriverDetail.lastName",
            coDriverFirstName: "$coDriverDetail.firstName",
            coDriverUserName: "$coDriverDetail.userName",
        },
        powerUnitLine: {
            vehicleNumber: "$vehicleDetail.vehicleNumber",
            vin: "$vehicleDetail.vin",
            trailerNumber: "$dailyLogsList.trailers",
        },
        carierLine: {
            companyDotNumber: "$company.dotNumber",
            companyName: "$company.companyName",
            companyMultiDayBasisUsed: "",
            companyRestartHours: "$company.restartHours",
            companyTimeZoneId: "$company.timeZoneId",
        },
        shippingLine: {
            shippingDocuments: "$dailyLogsList.shippingDocuments",
            exemptDriver: "$exempt"
        },
        timeplaceLine: {
            currentDate: "$hosEventDetail.eventDateTime",
            currentTime: "$hosEventDetail.eventDateTime",
            currentLat: "$hosEventDetail.lat",
            currentLong: "$hosEventDetail.lng",
            accumulatedVehicleMiles: "$hosEventDetail.accumulatedVehicleMiles",
            engineHours: "$hosEventDetail.engineHours",
        },
        eldIDLine: {
            eldRegistrationId: "$eldDetail.eldRegistrationId",
            eldIdentifier: "$eldDetail.eldIdentifier",
            eldAuthenticationValue: "$eldDetail.eldAuthenticationValue",
            outputFileComment: "$eldDetail.outputFileComment"
        }

    }
}


function getUnIdentifiedEventFields() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventStatus: "$hosEventDetail.eventStatus",
        recordOrigin: "$hosEventDetail.recordOrigin",
        eventType: "$hosEventDetail.eventCode",
        eventCode: "$hosEventDetail.eventCode",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        accumulatedVehicleMiles: "$hosEventDetail.accumulatedVehicleMiles",
        lat: "$hosEventDetail.lat",
        lng: "$hosEventDetail.lng",
        manualLocation: "$hosEventDetail.manualLocation",
        distSinceLastValidCoords: "$hosEventDetail.distSinceLastValidCoords",
        malfunctionAndDiagnosticCode: "$hosEventDetail.malfunctionAndDiagnosticCode",
        cmvOrderNumber: "$vehicleDetail._id",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getCmvEnginesPowerUpDownActiviy() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventCode: "$hosEventDetail.eventCode",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        odometer: "$hosEventDetail.odometer",
        engineHours: "$hosEventDetail.engineHours",
        lat: "$hosEventDetail.lat",
        lng: "$hosEventDetail.lng",
        vehicleNumber: "$vehicleDetail.vehicleNumber",
        vin: "$vehicleDetail.vin",
        latestDriverTrailers: "$latestDriverDailyLogsDetial.trailers",
        latestDriverShippingDocument: "$latestDriverDailyLogsDetial.shippingDocuments",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getEldLoginLogoutReport() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventCode: "$hosEventDetail.eventCode",
        userName: "$userName",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        odometer: "$hosEventDetail.odometer",
        engineHours: "$hosEventDetail.engineHours",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getMalfunctionAndDiagnosticEvent() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventCode: "$hosEventDetail.eventCode",
        malfunctionAndDiagnosticCode: "$hosEventDetail.malfunctionAndDiagnosticCode",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        odometer: "$hosEventDetail.odometer",
        engineHours: "$hosEventDetail.engineHours",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getEldEventListDriverCertificate() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventCode: "$hosEventDetail.eventCode",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        certifiedRecordDate: "$hosEventDetail.certifiedRecordDate",
        cmvOrderNumber: "$vehicleDetail._id",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getEldEventAnnotationsOrComment() {
    return {
        seqId: "$hosEventDetail.seqId",
        userName: "$userName",
        notes: "$hosEventDetail.notes",
        eventDateTime: "$hosEventDetail.eventDateTime",
        manualLocation: "$hosEventDetail.manualLocation",
        companyTimeZoneId: "$company.timeZoneId"
    }
}

function getEldEventList() {
    return {
        seqId: "$hosEventDetail.seqId",
        eventStatus: "$hosEventDetail.eventStatus",
        recordOrigin: "$hosEventDetail.recordOrigin",
        eventCode: "$hosEventDetail.eventCode",
        eventType: "$hosEventDetail.eventCode",
        logDate: "$hosEventDetail.logDate",
        eventDateTime: "$hosEventDetail.eventDateTime",
        accumulatedVehicleMiles: "$hosEventDetail.accumulatedVehicleMiles",
        elapsedEngineHours: "$hosEventDetail.elapsedEngineHours",
        lat: "$hosEventDetail.lat",
        lng: "$hosEventDetail.lng",
        distSinceLastValidCoords: "$hosEventDetail.distSinceLastValidCoords",
        cmvOrderNumber: "$vehicleDetail._id",
        userOrderNumber: "$_id",
        malfunctionInsdicatorStatus: "$hosEventDetail.malfunctionInsdicatorStatus",
        diagnosticIndicatorStatus: "$hosEventDetail.diagnosticIndicatorStatus",
        eventData: "0",
        companyTimeZoneId: "$company.timeZoneId",
        driverId: "$hosEventDetail.driverId",
        editRequestedByUserId: "$hosEventDetail.editRequestedByUserId"
    }
}

function getCmvList() {
    return {
        orderNumber: "$vehicleDetail._id",
        vehicleNumber: "$vehicleDetail.vehicleNumber",
        vin: "$vehicleDetail.vin"
    }
}

function getUsersList() {
    return {
        orderNumber: "$_id",
        firstName: "$firstName",
        lastName: "$lastName",
    }
}
