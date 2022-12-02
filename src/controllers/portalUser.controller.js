const jwt_decode = require("jwt-decode");
const createQuery = require("../helper/createQuery");
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const { hashPassword } = require("../helper/utils");
const UserModel = require("../Models/UserModel");

// global variables
const LIMIT = 20;
const selectedUsersFields = "role companyId firstName lastName email phoneNumber landingPage companiesId";

const initPortalUserController = () => {
    const createPortalUser = async (req, res) => {
        const { id, companyId } = req.query;
        const payload = req.body;
        const { getPortelFindQuery, updateUserModel, createNewTuple } = createQuery();

        try {
            const loggedInUser = await UserModel.findById(id);
            let driverFindQuery = getPortelFindQuery(payload, companyId);
            
            let existingPortel = await UserModel.findOne(driverFindQuery);
            if (existingPortel) return res.status(403).json(errorFunction(false, "Email already exist"));
            if (payload.id) {
                await hashPassword(payload.password);
                const updateModelResponse = await updateUserModel(payload, loggedInUser);
                if (!updateModelResponse) return res.send(403).json(errorFunction(false, "Unable to update Portel User information"))
                const { statusCode, body } = updateModelResponse;
                res.status(statusCode).send(body);
            } else {
                const creatingNewPortal = await createNewTuple(payload, loggedInUser, companyId, UserModel);
                if (!creatingNewPortal) return res.status(403).json(errorFunction(false, "Portel user can not be added"))
                const { statusCode, body } = getSuccessResponse(creatingNewPortal, "Portal User created successfully", true);
                res.status(statusCode).send(body);
            }
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "could not create portal user"));
        }
    }
    const getAllPortalUser = async (req, res) => {
        const { id, searchKey, searchStatus, page, companyId } = req.query;

        let pageLocal = 0;
        try {
            let findCondition = {
                isDeleted: false,
                companyId: companyId
            };
            pageLocal = page ? page : pageLocal;
            if (searchStatus) {
                findCondition.isActive = searchStatus == "active" ? true : false;
            }
            if (searchKey) {
                let searchKeyText = new RegExp(searchKey, "i");
                findCondition['$or'] = [{ firstName: searchKeyText }, { lastName: searchKeyText }, { email: searchKeyText }];
            }
            const totalDocuments = await UserModel.countDocuments(findCondition);
            
            if (totalDocuments == 0) return res.status(200).json(getSuccessResponse({ users: [] }, "No record found", false));

            if (pageLocal && (pageLocal > 0)) {
                skip = (parseInt(page) - 1) * LIMIT
            }
            
            let UserList = await UserModel.find(findCondition)
                .select({
                    "firstName": 1,
                    "lastName": 1,
                    "email": 1,
                    "role": 1,
                    "isActive": 1
                }).limit(LIMIT).skip(skip).sort({ createdAt: -1 })
            var count = UserList.length
            let list = [];
            if (UserList.length > 0) {
                UserList.map(row => {
                    list.push({
                        id: row.id,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        email: row.email,
                        role: row.role,
                        active: row.isActive
                    })
                })
            }
            var resultData = {
                "users": list,
                "totalPages": Math.ceil(totalDocuments / LIMIT),
                "count": count,
                "totalRecord": totalDocuments
            };
            const {statusCode, body} = getSuccessResponse(resultData, "Users Fetched Successfully", true);
            return res.status(statusCode).send(body)
        } catch (err) {
            console.error(err);
            return res.status(500).json(errorFunction(false, "Could not fetch users"));
        }
    }
    const getPortalUser = async (req, res) => {
        const {companyId} = req.query;
        const {id : askedId } = req.params;
        try{
            const findQuery = {
                isDeleted : false, 
                companyId : companyId,
                _id : askedId
            }
            const askedUser = await UserModel.findOne(findQuery)
            if(!askedUser) return res.status(404).json(errorFunction(false, "No Record Found"));
            const {statusCode, body} = getSuccessResponse(askedUser, "User Fetched Successfully", true)
            res.status(statusCode).send(body);
        }catch(err){
            console.error(err);
            res.status(500).json(errorFunction(false, "Unable to find the user"));
        }
    }
    // it will handle both activation and deactivation
    const deactivatePortalUser = async (req, res) => {
        const {id} = req.query;
        const {id : askedId} = req.params;
        let selectedFields = selectedUsersFields + " isActive nickName accessAllCompanies";

        try{
            const findUserQuery = {
                isDeleted : false, 
                _id :  askedId,
                createdBy : id
            }
            
            // finding the user now
            const askedUser = await UserModel.findOne(findUserQuery);
            if(!askedUser) return res.status(403).json(errorFunction(false, "You are not authorized to deactivate this user"))
            
            // deactivating the user now
            const updatedUser = await UserModel.findOneAndUpdate(findUserQuery, {$set : {isActive : !askedUser.isActive}}, {new : true, selected : selectedFields}) 
            if(!updatedUser) return res.status(401).json(errorFunction(false, "Could not deactivate user"));
            const {statusCode, body} = getSuccessResponse(updatedUser, `User is ${updatedUser.isActive ? "Activated" : "Deactivated"} successfully`, true);
            res.status(statusCode).send(body);
        }catch(err){
            console.error(err);
            res.status(500).json(false, "Could not deactivate user")
        }
    }
    return {
        createPortalUser,
        getAllPortalUser,
        getPortalUser,
        deactivatePortalUser
    }
}

module.exports = initPortalUserController;