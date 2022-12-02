const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  displayId: {
    type: String,
    default: "",
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  companiesId: [mongoose.Schema.Types.ObjectId],
  accessAllCompanies: { type: Boolean, default: false },
  nickName: {
    type: String,
  },
  firstName: {
    type: String,
    default: "",
  },
  lastName: {
    type: String,
    default: "",
  },
  stripeCustomerId: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Please add an valid email"],
    trim: true,
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please add password"],
  },
  pic: {
    // added to display user image in chat
    type: "String",
    required: true,
    default:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460__340.png",
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: [
      "system-super-admin",
      "system-administrator",
      "system-technician",
      "company-administrator",
      "company-support-user",
      "company-portal-user",
      "company-fleet-manager",
    ],
  },
  landingPage: {
    type: String,
    default: "",
  },
  emailVerified: {
    type: Boolean,
    default: true,
  },
  verificationToken: {
    type: String,
  },
  // sessions:[{
  //     displayId:{
  //         type:String,
  //         default:''
  //     },
  //     ip:{
  //         type:String,
  //         default:''
  //     },
  //     lastAccessed:{
  //         type:String,
  //         default:''
  //     },
  //     browser:{
  //         type:String,
  //         default:''
  //     },
  //     operatingSystem:{
  //         type:String,
  //         default:''
  //     }
  // }],
  extraPermissions: [],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: {
    type: String,
    default: "",
  },
  resetPasswordExpires: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.createdAt;
  delete userObject.updatedAt;
  delete userObject.isDeleted;
  delete userObject.__v;
  return userObject;
};
const User = mongoose.model("User", userSchema);

module.exports = User;
