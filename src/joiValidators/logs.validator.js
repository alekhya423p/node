const joi = require("joi")

exports.getActiveDriversLogsValidator = joi.object({
    page: joi.number().required(),
    searchKey: joi.string().allow("").optional(),
    searchDate: joi.string().allow("").optional(),
    mannerErrors: joi.string().valid("all",
        "no_error",
        "no_certification",
        "no_trailer_number",
        "no_shipping_doc").allow("").required(),
    violationStatus: joi.string().valid("all",
        "no_violation",
        "hos_violation",).allow("").required(),
    companyId: joi.string().length(24).optional(),
    id: joi.string().length(24).optional()
})


exports.getLogsValidator = joi.object({
    driverId: joi.string().length(24).required(),
    page: joi.number().required(),
    searchDate: joi.string().allow(""),
    mannerErrors: joi.string().valid("all",
        "no_error",
        "no_certification",
        "no_trailer_number",
        "no_shipping_doc").allow("").required(),
    violationStatus: joi.string().valid("all",
        "no_violation",
        "hos_violation").allow("").required(),
    companyId: joi.string().length(24).optional(),
    id: joi.string().length(24).optional()
})

exports.processedLogsValidator = joi.object({
    driverId: joi.string().length(24).required(),
    date: joi.date().required(),
    id: joi.string().optional(),
    companyId: joi.string().optional(),
})
exports.editFormTechnicianValidator = joi.object({
    logId: joi.string().length(24).required(),
    coDriverId: joi.string().allow(null).optional(),
    trailers: joi.string().allow(""),
    shippingDocuments: joi.string().allow("").optional(),
    isCertified: joi.boolean().required(),
    logDate: joi.date().optional(),
    driverId: joi.string().length(24).optional()
})
exports.addEventTechValidator = joi.object({
    seqId: joi.string().required(),
    positioning: joi.string().required(),
    vehicleId: joi.required(),
    origin: joi.string().required().valid('AUTO', 'DRIVER', 'OTHER_USER', 'UNIDENTIFIED_DRIVER'),
    driverStatus: joi.string().required().valid('DS_OFF','DS_SB','DS_D','DS_ON','DS_WT','DR_IND_YM','DR_LOGIN','DR_IND_PC','ELD_DIAG_CLEARED','ELD_DIAG','ELD_MALF_CLEARED','ELD_MALF','ENG_DOWN_REDUCED','ENG_DOWN_NORMAL','ENG_UP_REDUCED','ENG_UP_NORMAL','DR_LOGOUT','DR_CERT_1','DR_CERT_2','DR_CERT_3','DR_CERT_4','DR_CERT_5','DR_CERT_6','DR_CERT_7','DR_CERT_8','DR_CERT_9','DR_IND_CLEARED','INTER_REDUCED_PERCISION','INTER_NORMAL_PRECISION'),
    state: joi.string().required().valid('ACTIVE','INACTIVE_CHANGED','INACTIVE_CHANGE_REQUESTED','INACTIVE_CHANGE_REJECTED'),
    odometer: joi.string().allow(''),
    engineHours: joi.string().allow(''),
    lat: joi.string().allow(''),
    lng: joi.string().allow(''),
    notes: joi.string().allow(''),
    eldId: joi.string().allow(''),
    locSource: joi.string().allow('').required(),
    locNote: joi.string().allow(''),
    startTime: joi.string().allow(''),
    calcLoc: joi.string().allow(''),
    certifyDate: joi.string().allow(''),
    isCreate: joi.boolean().allow(''),
    isPositioning: joi.boolean().allow(''),
    driverId: joi.string().allow('').required(),
    logId: joi.string().allow(''),
    logDate: joi.string().allow(''),
    start_date: joi.string().allow('').required(),

})

exports.editBulkEventsValidator = joi.object({
    ids : joi.array().items(joi.string().length(24)).required(),
    type : joi.valid("days", "hours").required(),
    value : joi.number().required()
})


exports.reassignEventTechnicianValidator = joi.object({
    
        logDate: joi.date().required(),
        driverId: joi.string().length(24).required(),
        logId: joi.string().length(24).required(),
        ids: joi.array().items(joi.string().length(24)).required(),
        currentDriverId: joi.string().length(24).required()
    
})

exports.removeEventTechnicianValidator = joi.object({
    logDate: joi.date().required(),
    driverId: joi.string().length(24).required(),
    logId: joi.string().length(24).required(),
    ids: joi.array().items(joi.string().length(24)).required()
})