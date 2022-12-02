require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const { hashPassword } = require("../helper/utils");
const CompanyModel = require("../Models/CompanyModel");
const UserModel = require("../Models/UserModel");
const constant = require("../helper/constants");
const createQuery = require("../helper/createQuery");
const _ = require("lodash");
const companiesListField = "companyName dotNumber address displayId isActive"
const { constructCompanyObjectForSystemCreation } = require("../helper/createObjects");


const initCompanyController = () => {
    const editCompany = async (req, res) => {
        const { id } = req.query;
        try {
            const { companyId } = await UserModel.findOne({ _id: id });
            const resultUpdated = await CompanyModel.findByIdAndUpdate(companyId, { $set: req.body }, { new: true });
            if (!resultUpdated) return res.status(403).json(errorFunction(false, "Unable to update Company"));
            const { statusCode, body } = getSuccessResponse(resultUpdated, "Company Updated Successfully", true);
            res.status(statusCode).send(body)
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Unable to Update Company"))
        }
    }
    const getCompany = async (req, res) => {
        const { companyId } = req.query;
        try {
            const askedCompany = await CompanyModel.findOne({ _id: companyId, isDeleted: false });
            
            if (!askedCompany) return res.status(403).json(errorFunction(false, 'Unable to fetch Company'))
            const { statusCode, body } = getSuccessResponse(askedCompany, "Company fetched successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Unable to fetch Company"))
        }
    }
    const updateProfileUser = async (req, res) => {
        const { id } = req.query;
        const receivedPayload = req.body;
        try {
            const { password, email } = receivedPayload;
            if (password) {
                const hashedPassword = await hashPassword(password);
                receivedPayload.password = hashedPassword;
            }
            if (email) delete receivedPayload.email;
            const resultUpdated = await UserModel.findByIdAndUpdate(id, receivedPayload, { new: true });
            if (!resultUpdated) return res.status(403).json(errorFunction(false, "Unable to update Profile"))
            const { statusCode, body } = getSuccessResponse(resultUpdated);
            res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Unable to update Profile"))
        }
    }
    const getCompaniesList = async (req, res) => {
        const { id, companyId, searchStatus, searchCompany } = req.query;
        let { searchKey } = req.query;
        const { getAllCompanyDetails } = createQuery();
        try {
            const loggedInUser = await UserModel.findById(id);
            let findCompaniesQuery = { _id: { $in: loggedInUser.companiesId } }
            if (searchKey && searchKey !== "") {
                searchKey = new RegExp(searchKey, 'i')
                findCompaniesQuery['$or'] = [{ companyName: searchKey }, { dotNumber: searchKey }]
            }
            if (searchCompany) {
                companyIdForQuerying = new RegExp(searchCompany, 'i')
                findCompaniesQuery.displayId = companyIdForQuerying;
            }
            if (searchStatus) {
                searchStatus === "active" ? findCompaniesQuery.isActive = true : findCompaniesQuery.isActive = false;
            }

            if (loggedInUser.role == constant.ROLES.SYSTEM_SUPER_ADMIN || loggedInUser.accessAllCompanies) {
                // deleting id filter because super user can access all the data
                delete findCompaniesQuery._id;
            }

            let companiesList = await getAllCompanyDetails(findCompaniesQuery, CompanyModel);
            if (!companiesList) return res.status(404).json(errorFunction(false, "No companies found"));
            const { statusCode, body } = getSuccessResponse(companiesList, "Companies Fetched Successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not fetch companies"))
        }
    }
    const createCompany = async (req, res) => {
        const { id } = req.query;
        const payload = req.body;
        try {
            const checkExistCompanyWithDotQuery = {
                isDeleted: false,
                dotNumber: payload.dotNumber
            }
            const checkExistCompanyWithDot = await CompanyModel.findOne(checkExistCompanyWithDotQuery);
            if (checkExistCompanyWithDot) return res.status(423).json(errorFunction(false, "Company dot number is already in use"));
            payload.terminals = [{
                timeZone: payload.timeZone,
                address: payload.terminalAddress,
                createdBy: id,
                updatedBy: id
            }];
            const updatedPayload = constructCompanyObjectForSystemCreation(payload);
            const createCompany = await CompanyModel.create(updatedPayload);
            if (!createCompany) return res.status(501).json(errorFunction(false, "Could not create company"))
            // after the company is created, add the companyId created in companies keyVal pair
            const updateUser = await UserModel.findByIdAndUpdate(id, { $push: { companiesId: createCompany._id } })
            if (!updateUser) return res.status(423).json(errorFunction(false, "Could not update the record"));
            const finalResponse = await CompanyModel.findOne({ _id: createCompany._id }, companiesListField)
            const { statusCode, body } = getSuccessResponse(finalResponse, "Companies created Successfully", true);
            res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Company not created"))
        }
    }
    const deactivateCompanySystemAdmin = async (req, res) => {
        const { id: askedId } = req.params;
        const { id: userId } = req.query;
        try {
            let userHasCompany = await UserModel.findOne({ _id: userId, companiesId: { $in: askedId } });
            if (!userHasCompany) return res.status(401).json(errorFunction(false, "User not authorized for this operation"))
            let companyDetail = await CompanyModel.findOne({ _id: askedId }, "isActive");
            if (!companyDetail) return res.status(404).json(errorFunction(false, "Company Not found!"));
            CompanyModel.findOneAndUpdate({ _id: askedId }, { $set: { isActive: !companyDetail.isActive } }, { new: true })
                .then(company => {
                    const {statusCode , body} = getSuccessResponse(company, `Company ${company.isActive ? 'activated' : 'deactivated'} successfully`, true)
                    return res.status(statusCode).send(body);
                })
                .catch(err=>{
                    console.log(err);
                    return res.status(403).json(errorFunction(false, "Status could not be updated"))
                })
        
        }
        catch (err) {
            console.log(err);
            return res.status(500).json(errorFunction(false, "Status could not be updated"))
        }
}
return {
    editCompany,
    getCompany,
    updateProfileUser,
    getCompaniesList,
    createCompany,
    deactivateCompanySystemAdmin
}

}

module.exports = initCompanyController;