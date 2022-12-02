const {Router} = require("express");
const initCompanyController = require("../controllers/company.controller");
const { updateCompanyValidator, companyListValidator, createCompanyValidator } = require("../joiValidators/Company.Validator");
const { tokenVerification, customValidation } = require("../Middlewares/validation");
const router = Router();
const constants = require("../helper/constants");
const { idValidatorForParams } = require("../joiValidators/portalUser.validator");

const companyRouter = () => {
    const {
        editCompany,getCompany,updateProfileUser,getCompaniesList, createCompany,deactivateCompanySystemAdmin
    } = initCompanyController();

    router.route("/editCompany").post(tokenVerification(),editCompany);
    router.route("/getCompanyUser").get(tokenVerification(), getCompany);
    router.route("/updateCompanyUser").post([customValidation(updateCompanyValidator, "body"),tokenVerification()], updateProfileUser);
    router.route("/companiesList").get([tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN), customValidation(companyListValidator, "query")], getCompaniesList);
    router.route("/createCompanyBySystem").post(customValidation(createCompanyValidator, "body"),[tokenVerification(constants.ROLES.CREATE_COMPANY_SYSTEM)],createCompany)
    router.route("/deactivate/:id").put([customValidation(idValidatorForParams, "params"), tokenVerification(constants.ROLES.SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN)], deactivateCompanySystemAdmin)

    return router;
}

module.exports = companyRouter;