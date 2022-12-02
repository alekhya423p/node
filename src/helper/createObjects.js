const _ = require("lodash");

exports.constructCompanyObject = function (userObject) {
    const requiredData = _.pick(userObject, "companyName","dotNumber","phoneNumber", "timeZoneId")
    return {
     ...requiredData, 
     cycle : "70H_CYCLE_LIMIT",
      cargoType : "PROPERTY",
      restartHours : "34H",
      restBreak : "30M_REST_BREAK",
      shortHaulAllowed : false,
      splitSBAllowed : false,
      pcAllowed : true,
      ymAllowed : true,
      manualDriveAllowed : true   
    }
}
exports.constructUserObject = function (userObject, companyId, hashedPassword, code) {
    const userRequiredData = _.pick(userObject, "firstName", "lastName", "email", "phoneNumber");
    return {
        ...userRequiredData, 
        companyId, 
        password : hashedPassword, 
        verificationToken: code, 
        role: "company-administrator"
    }
}

exports.constructCompanyObjectForSystemCreation = (companyObject) => {
    return {
        ...companyObject, 
        cycle : "70H_CYCLE_LIMIT",
        cargoType : "PROPERTY",
        restartHours : "34H",
        restBreak : "30M_REST_BREAK",
        shortHaulAllowed : false,
        splitSBAllowed : false,
        pcAllowed : true,
        ymAllowed : true,
        manualDriveAllowed : true,
        timeZoneId : companyObject.timeZone
    }
}