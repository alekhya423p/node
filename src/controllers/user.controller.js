require("dotenv").config();
const jwt_decode = require("jwt-decode");

const {
  matchPassword,
  hashPassword,
  makeRandomString,
  encodeToken,
  sendMailsUsingMailGun,
} = require("../helper/utils");
const { getSuccessResponse, ApiResponse } = require("../helper/success");
const errorFunction = require("../helper/errorFunction");
const sendEmail = require("../utils/nodemailer");
const jwt = require("jsonwebtoken");
// Models
const UserModel = require("../Models/UserModel");
const CompanyModel = require("../Models/CompanyModel");
const SubscriptionModel = require("../Models/SubscriptionModel");
const selectedUsersFields =
  "role companyId firstName lastName email phoneNumber landingPage companiesId";
const {
  constructCompanyObject,
  constructUserObject,
} = require("../helper/createObjects");
const {
  verifyEmailTemplate,
  forgotPasswordTemplate,
} = require("../utils/emailTemplates");
const constants = require("../helper/constants");
const {
  getUserToken,
  generateLoginUserRefreshToken,
} = require("../helper/UserToken");
const createQuery = require("../helper/createQuery");
const _ = require("lodash");
const initUserController = () => {
  const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
      const userInfo = await UserModel.findOne({ email: email });
      if (userInfo === null) {
        res.status(401).json(errorFunction(false, "User does not exists"));
      } else {
        if (userInfo.emailVerified === false)
          return res
            .status(401)
            .json(errorFunction(false, "Please verify your email"));
        if (userInfo.isActive === false)
          return res
            .status(401)
            .json(errorFunction(false, "Your account is deactivated"));
        const matchedPassword = await matchPassword(
          password,
          userInfo.password
        );
        if (!matchedPassword)
          return res
            .status(401)
            .json(errorFunction(false, "Password does not match"));

        const { userObj, token } = await getUserToken(userInfo);
        const { statusCode, body } = getSuccessResponse(
          userObj,
          "Login Successful",
          true,
          token
        );
        res.status(statusCode).send(body);
      }
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json(errorFunction(false, "Some error Occured while logging in"));
    }
  };
  const createUser = async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      companyName,
      dotNumber,
      timeZone,
      phoneNumber,
      password,
    } = req.body;
    try {
      let findCompCond = { isDeleted: false, dotNumber: dotNumber };
      let existingCompany = await CompanyModel.findOne(findCompCond);
      if (existingCompany) {
        const { body } = getSuccessResponse(
          {},
          "Company dot number is already in use.",
          false
        );
        return res.status(403).send(body);
      }
      let findUserCond = { isDeleted: false, email: email };
      let existingUser = await UserModel.findOne(findUserCond);
      if (existingUser) {
        const { body } = getSuccessResponse(
          {},
          "Email is already in use",
          false
        );
        return res.status(403).send(body);
      }
      let companyObj = {
        companyName,
        dotNumber,
        phoneNumber,
        timeZoneId: timeZone,
        cycle: "70H_CYCLE_LIMIT",
        cargoType: "PROPERTY",
        restartHours: "34H",
        restBreak: "30M_REST_BREAK",
        shortHaulAllowed: false,
        splitSBAllowed: false,
        pcAllowed: true,
        ymAllowed: true,
        manualDriveAllowed: true,
      };

      let createdCompanyInfo = await CompanyModel.create(companyObj);

      if (createdCompanyInfo) {
        const companyId = createdCompanyInfo._id;
        const hashedPassword = await hashPassword(password);
        let code = await makeRandomString(50);
        let userObj = {
          companyId: companyId,
          firstName,
          lastName,
          email,
          password: hashedPassword,
          phoneNumber,
          emailVerified: false, //TODO Need to false temprorly true
          role: "company-administrator",
          verificationToken: code,
        };
        var createdUser = await UserModel.create(userObj);
        if (createdUser) {
          const userId = createdUser._id;
          let userInfo = createdUser.toObject();
          userInfo.id = createdUser._id;
          let Link = `${process.env.AWS_ACCESS_URL}/verify/${userId}/${code}`;
          let response = await sendMailsUsingMailGun(
            [email],
            "User",
            Link,
            "Verification"
          );
          if (!response) {
            const { body } = getSuccessResponse(
              {},
              "Could not send the email",
              false
            );
            return res.status(403).send(body);
          }

          const { statusCode, body } = getSuccessResponse(
            createdUser,
            "Account created succussfully.",
            true
          );
          return res.status(statusCode).send(body);
        }
      }
      const { body } = getSuccessResponse(
        {},
        "Unable to create account.",
        false
      );
      return res.status(403).send(body);
    } catch (err) {
      console.log(err);
      res.status(500).json(errorFunction(false, "Account Not created"));
    }
  };
  const verifyUser = async (req, res) => {
    const { id, token } = req.body;
    try {
      const query = {
        _id: id,
        verificationToken: token,
      };
      const foundUser = UserModel.findOne(query);
      if (!foundUser) {
        const { statusCode, body } = getSuccessResponse(
          {},
          "Invalid Link",
          false
        );
        return res.status(statusCode).send(body);
      }
      UserModel.updateOne(
        { _id: id },
        { emailVerified: true, verificationToken: "" }
      )
        .then(() => {
          const { statusCode, body } = getSuccessResponse(
            {},
            "Verified Successfully",
            true
          );
          res.status(statusCode).send(body);
        })
        .catch((err) => {
          console.log(err);
          res.status(401).json(errorFunction(false, "Some error Occured"));
        });
    } catch (err) {
      console.error(err);
      res.status(500).json(errorFunction(false, "Could not verify User"));
    }
  };
  const getProfileUser = async (req, res) => {
    const { id } = req.query;
    try {
      let loggedUser = await UserModel.findById(id);
      if (!loggedUser)
        return res.status(404).json(errorFunction(false, "User not found!"));

      delete loggedUser.password;
      const { statusCode, body } = getSuccessResponse(
        loggedUser,
        "User Profile fetched successfully",
        true
      );
      res.status(statusCode).json(body);
    } catch (error) {
      console.error(error);
      res.status(500).json(errorFunction(false, "Could not fetch users"));
    }
  };
  const changePassword = async (req, res) => {
    const { id } = req.query;
    const { oldPassword, newPassword } = req.body;
    try {
      const askedUser = await UserModel.findById({ _id: id });
      const matchedPassword = await matchPassword(
        oldPassword,
        askedUser.password
      );
      if (matchedPassword === false)
        return res
          .status(403)
          .json(errorFunction(false, "Old Password doesn't match"));
      const hashedPassword = await hashPassword(newPassword);
      await UserModel.findOneAndUpdate(
        { _id: id },
        { password: hashedPassword }
      );
      const { statusCode, body } = getSuccessResponse(
        {},
        "Password changed Successfully",
        true
      );
      res.status(statusCode).send(body);
    } catch (err) {
      console.error(err);
      res.status(500).json(errorFunction(false, "Unable to update password."));
    }
  };
  const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
      const askedUser = await UserModel.findOne({ email: email });
      console.log(askedUser);
      if (!askedUser)
        return res.status(404).json(errorFunction(false, "User not found"));
      const token = jwt.sign(
        { hashedPassword: askedUser.password },
        process.env.RESET_PASSWORD_TOKEN,
        {
          // expires in 15 minutes
          expiresIn: 60 * 15,
        }
      );
      const forgotPasswordLink = `${process.env.LOCAL_URL}/user/reset-password?secret=${token}&id=${askedUser._id}`;
      const name = askedUser.firstName + " " + askedUser.lastName;
      const content = forgotPasswordTemplate(name, forgotPasswordLink);
      const emailResponse = await sendEmail(email, "Forgot Password", content);
      if (!emailResponse)
        return res
          .status(403)
          .json(errorFunction(false, "Unable to send Email"));
      const { statusCode, body } = getSuccessResponse(
        {},
        "Password Reset Email Sent Successfully",
        true
      );
      res.status(statusCode).send(body);
    } catch (error) {
      res
        .status(500)
        .json(errorFunction(false, "Unable to send Password Reset Email"));
    }
  };
  const refreshUserToken = async (req, res) => {
    const { id, companyId } = req.query;
    const { id: askedId } = req.params;
    try {
      let userDetail = await UserModel.findOne({ _id: id });
      let companyQuery = {
        $and: [{ _id: askedId }, { _id: { $in: userDetail.companiesId } }],
      };

      if (
        userDetail.role == constants.ROLES.SYSTEM_SUPER_ADMIN ||
        userDetail.accessAllCompanies
      )
        companyQuery = { _id: askedId };
      let companyDetail = await CompanyModel.findOne(companyQuery);
      if (!companyDetail) {
        const { body } = getSuccessResponse(
          {},
          "User not authorized to access this company",
          false
        );
        return res.status(403).send(body);
      }

      companyDetail.terminals.push({
        address: companyDetail.address,
        timeZone: companyDetail.timeZoneId,
      });
      if (userDetail.stripeCustomerId) {
        let subscriptionQuery = {
          $and: [
            { status: "active" },
            { customerId: userInfo.stripeCustomerId },
          ],
        };
        var subscriptionInfo = await SubscriptionModel.findOne(
          subscriptionQuery
        );
      }
      userDetail = JSON.parse(JSON.stringify(userDetail));
      userDetail.companyId = companyDetail._id;
      userDetail.userType = userDetail.role;
      userDetail.companyInfo = companyDetail;
      userDetail.companyInfo.subscription = subscriptionInfo;
      userDetail.id = userDetail._id;
      delete companyDetail._id;
      delete userDetail.role;
      delete userDetail.companiesId;
      const token = await encodeToken(userDetail);
      const { statusCode, body } = getSuccessResponse(
        userDetail,
        "Login successful",
        true,
        token
      );
      res.status(statusCode).send(body);
    } catch (err) {
      console.error(err);
      res.status(500).json(errorFunction(false, "Something went wrong!"));
    }
  };
  const getSystemUsersList = async (req, res) => {
    const { getUsersWithCompanyName } = createQuery();
    const { searchKey, searchStatus } = req.query;
    try {
      let findUserQuery = {
        $and: [
          {
            isDeleted: false,
            role: { $in: constants.ROLES.SYSTEM_ADMINISTRATOR_AND_TECHNICIAN },
          },
        ],
      };

      let totalRecord = await UserModel.find(findUserQuery).count();
      if (searchKey) {
        searchKey = new RegExp(searchKey, "i");
        findUserQuery["$and"].push({
          $or: [
            { email: searchKey },
            { nickName: searchKey },
            { firstName: searchKey },
            { lastName: searchKey },
          ],
        });
      }

      if (searchStatus)
        findUserQuery["$and"].push({
          isActive: searchStatus == "active" ? true : false,
        });
      let accessAllCompaniesUser = await UserModel.find({
        isDeleted: false,
        accessAllCompanies: true,
        $and: findUserQuery["$and"],
      });
      findUserQuery["$and"].push({
        companiesId: { $exists: 1 },
        accessAllCompanies: false,
      });
      let usersList = await getUsersWithCompanyName(findUserQuery);
      if (usersList.length) {
        usersList = _.map(usersList, (user) => {
          user.companiesObject = _.map(
            user.companiesObject,
            (company) => company.companyName
          );
          return user;
        });
      }
      usersList = _.concat(usersList, accessAllCompaniesUser);
      let count = usersList.length;
      let totalPages = Math.ceil(count / process.env.WEB_LIMIT);
      let userListResponse = {
        users: usersList,
        count: count,
        totalRecord: totalRecord,
        totalPages: totalPages,
      };
      const { statusCode, body } = getSuccessResponse(
        userListResponse,
        "Users list",
        true
      );
      return res.status(statusCode).send(body);
    } catch (err) {
      console.error(err);
      return res
        .status(403)
        .json(errorFunction(false, "could not fetch Users"));
    }
  };
  const refreshTokenSystemUser = async (req, res) => {
    const userToken =
      req.headers["authorization"] &&
      req.headers["authorization"].split(" ")[1];
    try {
      let decodedToken = jwt_decode(userToken);
      let { userObj, token } = await generateLoginUserRefreshToken(
        decodedToken
      );
      const { statusCode, body } = getSuccessResponse(
        userObj,
        "Token refresh successful",
        true,
        token
      );
      return res.status(statusCode).send(body);
    } catch (err) {
      console.error(err);
      res.status(500).json(errorFunction(false, "Something went wrong!"));
    }
  };
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
      const resultUpdated = await UserModel.findByIdAndUpdate(
        id,
        receivedPayload,
        { new: true }
      );
      if (!resultUpdated)
        return res
          .status(403)
          .json(errorFunction(false, "Unable to update Profile"));
      const { statusCode, body } = getSuccessResponse(resultUpdated);
      res.status(statusCode).send(body);
    } catch (err) {
      console.error(err);
      res.status(500).json(errorFunction(false, "Unable to update Profile"));
    }
  };

  return {
    loginUser,
    createUser,
    verifyUser,
    getProfileUser,
    changePassword,
    forgotPassword,
    refreshUserToken,
    getSystemUsersList,
    refreshTokenSystemUser,
    updateProfileUser,
  };
};

module.exports = initUserController;
