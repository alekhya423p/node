''
module.exports.createUsersListHeader = createUsersListHeader;
module.exports.createCmvListHeader = createCmvListHeader;
module.exports.createDriverLineSegmentHeader = createDriverLineSegmentHeader;
module.exports.createCoDriverLineSegmentHeader = createCoDriverLineSegmentHeader;
module.exports.createPowerLineSegmentHeader = createPowerLineSegmentHeader;
module.exports.carierLineSegmentHeader = carierLineSegmentHeader;
module.exports.shippingLineSegmentHeader = shippingLineSegmentHeader;
module.exports.timeplaceLineSegmentHeader = timeplaceLineSegmentHeader;
module.exports.eldIDLineSegmentHeader = eldIDLineSegmentHeader;
module.exports.createEldEventListHeader = createEldEventListHeader;
module.exports.createEldEventAnnotationsOrCommentHeader = createEldEventAnnotationsOrCommentHeader;
module.exports.createEldEventListDriverCertificateHeader = createEldEventListDriverCertificateHeader;
module.exports.createMalfunctionAndDiagnosticEventHeader = createMalfunctionAndDiagnosticEventHeader;
module.exports.createEldLoginLogoutReportHeader = createEldLoginLogoutReportHeader;
module.exports.createUnidentifiedEventHeader = createUnidentifiedEventHeader;
module.exports.createCmvEnginesPowerUpDownActivityHeader = createCmvEnginesPowerUpDownActivityHeader;

function createUsersListHeader() {
    return [
        { id: "orderNumber", title: "orderNumber" },
        { id: "eldAccountType", title: "eldAccountType" },
        { id: "firstName", title: "firstName" },
        { id: "lastName", title: "lastName" },
        { id: "lineDataCheck", title: "lineDataCheck"}
    ]
}

function createCmvListHeader() {
    return [
        { id: "orderNumber", title: "orderNumber" },
        { id: "vehicleNumber", title: "vehicleNumber" },
        { id: "vin", title: "vin" },
        { id: "lineDataCheck", title: "lineDataCheck" }
    ]
}

function createDriverLineSegmentHeader() {
    return [
        { id: 'firstName', title: 'firstName' },
        { id: 'lastName', title: 'lastName' },
        { id: 'userName', title: 'userName' },
        { id: 'licenseState', title: 'licenseState' },
        { id: 'licenseNumber', title: 'licenseNumber' },
        { id: 'lineDataCheck', title: 'lineDataCheck' },
    ]
}

function createCoDriverLineSegmentHeader() {
    return [
        { id: 'coDriverLastName', title: 'coDriverLastName' },
        { id: 'coDriverFirstName', title: 'coDriverFirstName' },
        { id: 'coDriverUserName', title: 'coDriverUserName' },
        { id: 'lineDataCheck', title: 'lineDataCheck' },
    ]
}

function createPowerLineSegmentHeader() {
    return [
        { id: 'vehicleNumber', title: 'vehicleNumber' },
        { id: 'vin', title: 'vin' },
        { id: 'trailerNumber', title: 'trailerNumber' },
        { id: 'lineDataCheck', title: 'lineDataCheck' },
    ]
}

function carierLineSegmentHeader() {
    return [
        { id: 'companyDotNumber', title: 'companyDotNumber' },
        { id: 'companyName', title: 'companyName' },
        { id: 'companyMultiDayBasisUsed', title: 'companyMultiDayBasisUsed' },
        { id: 'startingTime', title: 'startingTime' },
        { id: 'companyTimeZoneOffset', title: 'companyTimeZoneOffset' },
        { id: 'lineDataCheck', title: 'lineDataCheck' },
    ]
}

function shippingLineSegmentHeader() {
    return [
        { id: 'shippingDocuments', title: 'shippingDocuments' },
        { id: 'exemptDriver', title: 'exemptDriver' },
        { id: 'lineDataCheck', title: 'lineDataCheck' }
    ]
}

function timeplaceLineSegmentHeader() {
    return [
        { id: 'currentDate', title: 'currentDate' },
        { id: 'currentTime', title: 'currentTime' },
        { id: 'currentLat', title: 'currentLat' },
        { id: 'currentLong', title: 'currentLong' },
        { id: 'accumulatedVehicleMiles', title: 'accumulatedVehicleMiles' },
        { id: 'engineHours', title: 'engineHours' },
        { id: 'lineDataCheck', title: 'lineDataCheck' }
    ]
}

function eldIDLineSegmentHeader() {
    return [
        { id: 'eldRegistrationId', title: 'eldRegistrationId' },
        { id: 'eldIdentifier', title: 'eldIdentifier' },
        { id: 'eldAuthenticationValue', title: 'eldAuthenticationValue' },
        { id: 'outputFileComment', title: 'outputFileComment' },
        { id: 'lineDataCheck', title: 'lineDataCheck' }

    ]
}

function createEldEventListHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "eventStatus", title: "eventStatus" },
        { id: "recordOrigin", title: "recordOrigin" },
        { id: "eventType", title: "eventType" },
        { id: "eventCode", title: "eventCode" },
        { id: "logDate", title: "logDate" },
        { id: "eventDateTime", title: "eventDateTime" },
        { id: "accumulatedVehicleMiles", title: "accumulatedVehicleMiles" },
        { id: "elapsedEngineHours", title: "elapsedEngineHours" },
        { id: "lat", title: "lat" },
        { id: "lng", title: "lng" },
        { id: "distSinceLastValidCoords", title: "distSinceLastValidCoords" },
        { id: "cmvOrderNumber", title: "cmvOrderNumber" },
        { id: "userOrderNumber", title: "userOrderNumber" },
        { id: "malfunctionInsdicatorStatus", title: "malfunctionInsdicatorStatus" },
        { id: "diagnosticIndicatorStatus", title: "diagnosticIndicatorStatus" },
        { id: "eventData", title: "eventData" },
        { id: "lineDataCheck", title: "lineDataCheck" },

    ]
}

function createEldEventAnnotationsOrCommentHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "userName", title: "userName" },
        { id: "notes", title: "notes" },
        { id: "eventDate", title: "eventDate" },
        { id: "eventTime", title: "eventTime" },
        { id: "manualLocation", title: "manualLocation" },
        { id: "lineDataCheck", title: "lineDataCheck" },
    ]
}

function createEldEventListDriverCertificateHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "eventCode", title: "eventCode" },
        { id: "logDate", title: "logDate" },
        { id: "eventTime", title: "eventTime" },
        { id: "certifiedRecordDate", title: "certifiedRecordDate" },
        { id: "cmvOrderNumber", title: "cmvOrderNumber" },
        { id: "lineDataCheck", title: "lineDataCheck" },
    ]
}

function createMalfunctionAndDiagnosticEventHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "eventCode", title: "eventCode" },
        { id: "malfunctionAndDiagnosticCode", title: "malfunctionAndDiagnosticCode" },
        { id: "logDate", title: "logDate" },
        { id: "eventTime", title: "eventTime" },
        { id: "odometer", title: "odometer" },
        { id: "engineHours", title: "engineHours" },
        { id: "cmvOrderNumber", title: "cmvOrderNumber" },
        { id: "lineDataCheck", title: "lineDataCheck" },
    ]
}

function createEldLoginLogoutReportHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "eventCode", title: "eventCode" },
        { id: "userName", title: "userName" },
        { id: "logDate", title: "logDate" },
        { id: "eventTime", title: "eventTime" },
        { id: "odometer", title: "odometer" },
        { id: "engineHours", title: "engineHours" },
        { id: "lineDataCheck", title: "lineDataCheck" },
    ]
}


function createUnidentifiedEventHeader() {
    return [
        { id: 'seqId', title: 'SeqId' },
        { id: 'eventStatus', title: 'eventStatus' },
        { id: 'recordOrigin', title: 'recordOrigin' },
        { id: 'eventType', title: 'eventType' },
        { id: 'eventCode', title: 'eventCode' },
        { id: 'logDate', title: 'logDate' },
        { id: 'eventTime', title: 'eventTime' },
        { id: 'accumulatedVehicleMiles', title: 'accumulatedVehicleMiles' },
        { id: 'elapsedEngineHours', title: 'elapsedEngineHours' },
        { id: 'lat', title: 'lat' },
        { id: 'lng', title: 'lng' },
        { id: 'distSinceLastValidCoords', title: 'distSinceLastValidCoords' },
        { id: 'cmvOrderNumber', title: 'cmvOrderNumber' },
        { id: 'malfunctionAndDiagnosticCode', title: 'malfunctionAndDiagnosticCode' },
        { id: 'eventDataCheck', title: 'eventDataCheck' },
        { id: 'lineDataCheck', title: 'lineDataCheck' },
    ]
}

function createCmvEnginesPowerUpDownActivityHeader() {
    return [
        { id: "seqId", title: "seqId" },
        { id: "eventCode", title: "eventCode" },
        { id: "logDate", title: "logDate" },
        { id: "eventTime", title: "eventTime" },
        { id: "odometer", title: "odometer" },
        { id: "engineHours", title: "engineHours" },
        { id: "lat", title: "lat" },
        { id: "lng", title: "lng" },
        { id: "vehicleNumber", title: "vehicleNumber" },
        { id: "vin", title: "vin" },
        { id: "latestDriverTrailers", title: "latestDriverTrailers" },
        { id: "latestDriverShippingDocument", title: "latestDriverShippingDocument" },
        { id: "lineDataCheck", title: "lineDataCheck" },
    ]
}
