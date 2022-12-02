const CompanyModel = require("../Models/CompanyModel");
const SubscriptionModel = require("../Models/SubscriptionModel");
const UserModel = require("../Models/UserModel");
const { encodeToken } = require("./utils");

const getUserToken = async (userInfo) => {
    
    var companyInfo;
    if(userInfo.companiesId && userInfo.companiesId.length){
      userInfo.companyId = userInfo.companiesId[userInfo.companiesId.length - 1];
      companyInfo = await CompanyModel.findOne({ _id:userInfo.companyId });
    } else if(userInfo.accessAllCompanies){
      companyInfo = await CompanyModel.findOne({ isDeleted: false, isActive: true }).sort({createdAt:-1});
    }
    else
       companyInfo = await CompanyModel.findOne({ _id:userInfo.companyId });
    
    if(companyInfo && companyInfo.stripeCustomerId){
      let subscriptionQuery = { $and: [{status:'active'}, {customerId:companyInfo.stripeCustomerId}] };
      var subscriptionInfo = await SubscriptionModel.findOne(subscriptionQuery);
    }
    if(companyInfo){
     companyInfo = JSON.parse(JSON.stringify(companyInfo));
      companyInfo.terminals.push({ address: companyInfo.address, timeZone: companyInfo.timeZoneId});
      companyInfo.subscription = {
        stripeCustomerId:companyInfo.stripeCustomerId,
        subscriptionInfo:subscriptionInfo
      };
    } 
    let userObj = {
      id:userInfo._id,
      companyId:userInfo.companyId || companyInfo && companyInfo._id,
      firstName:userInfo.firstName,
      lastName:userInfo.lastName,
      email:userInfo.email,
      phoneNumber:userInfo.phoneNumber,
      userType:userInfo.role,
      landingPage:userInfo.landingPage,
      companyInfo: companyInfo,
      accessAllCompanies: userInfo.accessAllCompanies
    }
    const token = await encodeToken(userObj);
    
    return { userObj, token }
}
async function generateLoginUserRefreshToken(userInfo){
  
  var companyInfo = await CompanyModel.findOne({ _id: userInfo.company });
  var subscriptionInfo;
  userInfo = await UserModel.findOne({_id: userInfo.sub})
  if(companyInfo && companyInfo.stripeCustomerId){
    let subscriptionQuery = { status:'active', customerId:companyInfo.stripeCustomerId };
    
    subscriptionInfo = await SubscriptionModel.findOne(subscriptionQuery).sort({date:-1});
  }
  console.log(subscriptionInfo,"5922222222")
  
  if(companyInfo){
   companyInfo = JSON.parse(JSON.stringify(companyInfo));
    companyInfo.terminals.push({ address: companyInfo.address, timeZone: companyInfo.timeZoneId});
    companyInfo.subscription = {
      stripeCustomerId:companyInfo.stripeCustomerId,
      subscriptionInfo:subscriptionInfo
    };
  } 
  
  let userObj = {
    id:userInfo._id,
    companyId:userInfo.companyId || companyInfo && companyInfo._id,
    firstName:userInfo.firstName,
    lastName:userInfo.lastName,
    email:userInfo.email,
    phoneNumber:userInfo.phoneNumber,
    userType:userInfo.role,
    landingPage:userInfo.landingPage,
    companyInfo: companyInfo,
    accessAllCompanies: userInfo.accessAllCompanies,
    subscriptionId:subscriptionInfo && subscriptionInfo.stripeSubscriptionId ? subscriptionInfo.stripeSubscriptionId : "" , 
    customerId:companyInfo.stripeCustomerId
    
  }
  const token = await encodeToken(userObj);
  return { userObj, token }
}
module.exports = {getUserToken, generateLoginUserRefreshToken};