require("dotenv").config();
var emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
const bcrypt = require("bcryptjs");
const ITERATIONS = 12;
const moment = require("moment");
const jwt = require('jwt-simple');
const SECRETKEY = "D5\x12\x03\xaa\xe6\x97\xe6\x1b\x9cjT~\x0c\x1f\xffg\xe1O\xef\xbeL\xc6\n";
const nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
const { getAuthorizedResponse } = require('./success');
require('dotenv').config({ path: './variables.env' });
const AWS = require('aws-sdk');
const axios = require('axios').default;
const TO_NAME = 1;
// mailgun configuration 
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mailGumUrl = process.env.MAILGUN_URL
const mailGunApiKey = process.env.MAILGUN_API_KEY
const mg = mailgun.client({
	username: 'api',
	key: mailGunApiKey,
});
// mailgun configuration
const HOSEvent = require("../Models/HOSEventsModel")
const TO_ABBREVIATED = 2;
// const AWS_SES = new AWS.SES(SES_CONFIG);
const UserModel = require('../Models/UserModel');
const DriverModel = require('../Models/DriverModel');

const isEmailValid = async (email) => {
  if (!email)
    return false;
  if (email.length > 254)
    return false;
  var valid = emailRegex.test(email);
  if (!valid)
    return false;
  // Further checking of some things regex can't handle
  var parts = email.split("@");
  if (parts[0].length > 64)
    return false;
  var domainParts = parts[1].split(".");
  if (domainParts.some(function (part) { return part.length > 63; }))
    return false;
  return true;
}

const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, ITERATIONS);
  return hash;
};

const matchPassword = async (password, hash) => {
  const match = await bcrypt.compare(password, hash);

  return match;
};

const encodeToken = async (user, time) => {
  const payload = {
    exp: moment().add(14, 'days').unix(),
    iat: moment().unix(),
    sub: user.id,
    companyInfo: user.companyInfo,
    company: user.companyId,
    timeZone: user.timeZone
  }
  delete user.companyInfo;
  payload.user = user;
  if (!user.id)
    payload.sub = user._id;
  if (time)
    payload.timeLogin = time;
  return jwt.encode(payload, SECRETKEY)
}

const get_time_diff = async (datetime) => {
  // var datetime = typeof datetime !== 'undefined' ? datetime : "2014-01-01 01:02:03.123456";
  var datetime = new Date(datetime).getTime();
  var now = new Date().getTime();
  if (isNaN(datetime)) {
    return "";
  }
  //console.log( datetime + " " + now);
  if (datetime < now) {
    var milisec_diff = now - datetime;
  } else {
    var milisec_diff = datetime - now;
  }
  var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));
  var date_diff = new Date(milisec_diff);
  var str = '';
  if (days)
    str += days + " Days ";
  if (date_diff.getHours())
    str += date_diff.getHours() + " Hours ";
  if (date_diff.getMinutes())
    str += date_diff.getMinutes() + " Mins ";
  // if(date_diff.getSeconds())
  //   str += date_diff.getSeconds() + " Secs";
  return str;
  // return days + " Days "+ date_diff.getHours() + " Hours " + date_diff.getMinutes() + " Minutes " + date_diff.getSeconds() + " Seconds";
}


const sendEmail = async (email, str) => {
  try {
    const senderAddress = 'developmentsupor@gmail.com';
    const toAddress = email;
    const sesAccessKey = 'developmentsupor@gmail.com';
    const sesSecretKey = 'pcpnlufsvaatvxgj';

    const subject = "Guide";
    // The body of the email for recipients
    const body_html = `<!DOCTYPE> 
      <html>
        <body>
          <p>Hello,<br> Please Click on the link to reset your password.<br><a href=${str}>Click here to Reset Password</a></p>
        </body>
      </html>`;
    // Create the SMTP transport.
    const transporter = nodemailer.createTransport(smtpTransport({
      service: 'gmail',
      auth: {
        user: sesAccessKey,
        pass: sesSecretKey
      }
    }));
    // Specify the fields in the email.
    let mailOptions = {
      from: senderAddress,
      to: toAddress,
      subject: subject,
      html: body_html,
    };
    let info = await transporter.sendMail(mailOptions);
    return { error: false };
  } catch (error) {
    console.error("send-email-error", error);
    return {
      error: true,
      message: "Cannot send email",
    };
  }
}

const makeRandomString = async (length) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() *
      charactersLength));
  }
  return result;
}

function decodeToken(token) {
  // console.log("token",token);
  const payload = jwt.decode(token, SECRETKEY)
  const now = moment().unix();
  // check if the Token has Expired or it is wrong Format.Token should be provided in format 'Bearer Token'
  if (now > payload.exp) {
    return false
  }
  else {
    return payload;
  }
}

const ensureAuthenticated = async (token) => {
  if (token == undefined)
    return false;
  return await decodeToken(token);
}

const tokenAuthorization = async (e) => {
  if (!e.headers.Authorization) {
    return getAuthorizedResponse({}, "Unauthorised", false);
  }
  let auth = await ensureAuthenticated(e.headers.Authorization.split(' ')[1])
  if (!auth)
    return getAuthorizedResponse({}, "Token has Expired or it is wrong Format.Token should be provided in format 'Bearer Token'", false);
  return true;
}


const dynamicSort = function (myList) {
  var sortOrder = 1;
  //console.log(property)
  // if(property[0] === "-") {
  //     sortOrder = -1;
  //     property = property.substr(1);
  // }

  return myList.sort(function (x, y) {
    return x.createdAt - y.createdAt;
  })

  // return function (a,b) {
  //     if(sortOrder == -1){

  //         return b[property].localeCompare(a[property]);
  //     }else{
  //         return a[property].localeCompare(b[property]);
  //     }        
  // }
}

const getHours = function (duration) {
  var milliseconds = Math.floor((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + "hr" + minutes + "m";
}

const secondsToHms = function (d, type = 1) {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  var s = Math.floor(d % 3600 % 60);

  var hDisplay = h > 0 ? h : "";
  var mDisplay = m > 0 ? m : "";
  //var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  if (type == 2) {
    return hDisplay + "hr " + (mDisplay ? mDisplay : "00") + "min";
  }
  return hDisplay + ":" + (mDisplay ? mDisplay : "00");
}

function isoDateWithoutTimeZone(date) {
  if (date == null) return date;
  var timestamp = date.getTime() - date.getTimezoneOffset() * 60000;
  var correctDate = new Date(timestamp);
  return correctDate.toISOString();
}

const authenticateUserLoginToken = async (event) => {
  const jwt_decode = require('jwt-decode');
  if (event.headers.Authorization == undefined || !event.headers.Authorization) {
    //return getAuthorizedResponse({},"Unauthorised",false);
    return false
  }
  const authToken = event.headers.Authorization.split(' ')[1]
  let auth = await ensureAuthenticated(authToken)
  if (!auth) return false
  let decodedToken = jwt_decode(authToken);
  let loggedInUser = await UserModel.findById(decodedToken.sub);
  if (!loggedInUser) return false;
  loggedInUser.fetchCompany = decodedToken.company;
  if (decodedToken.company) loggedInUser.companyId = decodedToken.company;
  return loggedInUser;
}

const authenticateDriverLoginToken = async (event) => {
  const jwt_decode = require('jwt-decode');
  let decodedToken = jwt_decode(event.headers.Authorization.split(' ')[1]);
  let loggedInUser = await DriverModel.findById(decodedToken.sub);
  //console.log(loggedInUser);
  if (!loggedInUser) return false
  return loggedInUser;
}

const formatedDate = function (inputDate, type) {
  let formatedDate = ''
  let formatedMonth = ''
  let sortFormatedMonth = ''
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const sortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (inputDate) {
    //console.log(inputDate)
    var year = inputDate.getUTCFullYear()
    const month = inputDate.getUTCMonth()
    var day = inputDate.getUTCDate()
    var weekDay = inputDate.getUTCDay()

    var seconds = inputDate.getSeconds();
    var minutes = inputDate.getUTCMinutes();
    var hour = inputDate.getUTCHours();
    var ampm = (hour >= 12) ? "PM" : "AM";

    for (const index in months) {
      if (index == month) {
        formatedMonth = months[month]
        sortFormatedMonth = sortMonths[month]
      }
    }
    if (type == 1) {
      formatedDate = year + '-' + (month < 9 ? '0' + (month + 1) : (month + 1)) + '-' + ((day < 10) ? ('0' + day) : day)
    }
    if (type == 2) {
      formatedDate = sortFormatedMonth + ' ' + ((day < 10) ? ('0' + day) : day) + ', ' + year + ' - ' + ((hour < 10) ? ('0' + hour) : hour) + ':' + ((minutes < 10) ? ('0' + minutes) : minutes) + ':' + ((seconds < 10) ? ('0' + seconds) : seconds) + ' ' + ampm
    }
    if (type == 3) {
      formatedDate = sortFormatedMonth + ' ' + ((day < 10) ? ('0' + day) : day) + ', ' + year
    }
    if (type == 4) {
      formatedDate = sortFormatedMonth + ' ' + ((day < 10) ? ('0' + day) : day) + ', ' + year
    }
    if (type == 5) {
      formatedDate = ((hour < 10) ? ('0' + hour) : hour) + ':' + ((minutes < 10) ? ('0' + minutes) : minutes) + ':' + ((seconds < 10) ? ('0' + seconds) : seconds)
    }
  }
  //console.log(formatedDate)
  return formatedDate.toString()
}

const getEventCode = function (eventCode) {
  let eventCodeText;
  switch (eventCode) {
    case "DS_SB":
      eventCodeText = "Sleeper"
      break;
    case "DS_D":
      eventCodeText = "Driving"
      break;
    case "DS_ON":
      eventCodeText = "On Duty"
      break;
    case "DR_IND_YM":
      eventCodeText = "Yard Move"
      break;
    case "DR_LOGIN":
      eventCodeText = "Login"
      break;
    case "DR_IND_PC":
      eventCodeText = "Personal Conveyance"
      break;
    case "DR_LOGOUT":
      eventCodeText = "Logout"
      break;
    case "DR_CERT_1":
      eventCodeText = "Certification"
      break;
    default:
      eventCodeText = "Off Duty"
  }
  return eventCodeText
}

const getTimeZoneList = function () {
  let timeZones = [
    {
      id: "EST",
      displayText: "Eastern Standard Time",
      value: "America/New_York"
    },
    {
      id: "CST",
      displayText: "Central Standard Time",
      value: "America/Chicago"
    },
    {
      id: "MST",
      displayText: "Mountain Standard Time",
      value: "America/Denver"
    },
    {
      id: "PST",
      displayText: "Pacific Standard Time",
      value: "America/Los_Angles"
    },
    {
      id: "UTC",
      displayText: "Coordinated Universal Time",
      value: ""
    },
    {
      id: "AST",
      displayText: "Atlantic Standard Time",
      value: "Atlantic/Bermuda"
    },
    {
      id: "AKST",
      displayText: "Alaskan Standard Time",
      value: "America/Anchorage"
    },
    {
      id: "HST",
      displayText: "Hawaii Standard Time ",
      value: "Pacific/Honolulu"
    }

  ]
  return timeZones
}

const getCalculativeTimezone = function (timeZoneId) {

}
const getCalculatedTime = function (timeData) {
  let typeArr = ['breakTime', 'driveTime', 'shiftTime', 'cycleTime']
  switch (timeData.type) {
    case 'breakTime':
      eventCodeText = "Sleeper"
      break;
    case 'driveTime':
      eventCodeText = "Driving"
      break;
    case 'shiftTime':
      eventCodeText = "On Duty"
      break;
    default:
      eventCodeText = "Off Duty"
  }
  return eventCodeText
}


let sendSesEmail = (recipientEmail, name, str, Verification) => {
  let purpose = '';
  if (Verification)
    purpose = " verify your account";
  else
    purpose = " reset your password";
  let params = {
    Source: 'no-reply@lucideld.com',
    Destination: {
      ToAddresses: [
        recipientEmail
      ],
    },
    ReplyToAddresses: [],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<!DOCTYPE> 
          <html>
            <body>
              <p>Hello,<br> Please Click on the link to${purpose}.<br><a href=${str}>Click here</a></p>
            </body>
          </html>`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Hello, ${name}!`,
      }
    },
  };
  return AWS_SES.sendEmail(params).promise();
};

const generatePDF = async function (reportInfo) {
  const path = require('path')
  const filePath = path.join(__dirname, '../Assets/reports')
  const PDFGenerator = require('pdfkit')
  const fs = require('fs')
  let theOutput = new PDFGenerator
  //const fileName = filePath+'/IFTAReport.pdf'
  const fileName = '/IFTAReport.pdf'
  const pathToCreateFileStream = path.join(filePath, fileName);

  const stream = fs.createWriteStream(pathToCreateFileStream);
  const imagePath = path.join(__dirname, "../Assets/BLE-Logo.png")
  theOutput.pipe(stream)

  theOutput
    .image(imagePath, 50, 50, { width: 70 })
    .fillColor('#000')
    .fontSize(20)
    .text(`${reportInfo.Heading}`, 275, 50, { align: 'right' })

  const beginningOfPage = 50
  const endOfPage = 550
  const tableTop = 270
  const itemCodeX = 50
  const descriptionX = 100
  const quantityX = 250
  const priceX = 300
  const amountX = 350

  theOutput.moveTo(beginningOfPage, 200)
    .lineTo(endOfPage, 200)
    .stroke()

  theOutput.moveDown()
  theOutput
    .fontSize(18)
    .text('Vehicle Number', itemCodeX, tableTop, { bold: true })
    //.text('State', descriptionX, tableTop)
    .text('Distance', quantityX, tableTop)

  const items = reportInfo.records
  let i = 0
  for (i = 0; i < items.length; i++) {
    const item = items[i]
    const y = tableTop + 25 + (i * 25)

    theOutput
      .fontSize(14)
      .text(item.vehicleNumber, itemCodeX, y)
      //.text(item.state, descriptionX, y)
      .text(item.totalDistance, quantityX, y)
  }
  theOutput
    .fontSize(12)
    .text(`End of report. `, 50, 700, {
      align: 'center'
    })

  // write out file
  theOutput.end()
  await new Promise(resolve => {
    stream.on("finish", function () {
      resolve();
    });
  });
  return {
    pdfFilePath: pathToCreateFileStream,
    assetsPath: filePath
  }
}

const generateCSV = function (reportInfo) {
  const createCsvWriter = require('csv-writer').createArrayCsvWriter;
  const fs = require('fs');
  const csvWriter = createCsvWriter({
    header: reportInfo.fileHeaderArr, //,
    path: reportInfo.file
  });
  return csvWriter.writeRecords(reportInfo.records)
    .then(() => {
      return reportInfo.file
    });
}
const calculateDriverHOS = function (calculatedTimes) {
  var remainingBreakTime = 0
  var remainingDriveTime = 0
  var remainingShiftTime = 0
  var remainingCycleTime = 0
  if (calculatedTimes) {
    calculatedTimes.map((tRow) => {
      switch (tRow.type) {
        case 'breakTime':
          remainingBreakTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
          break;
        case 'driveTime':
          remainingDriveTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
          break;
        case 'cycleTime':
          remainingCycleTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
          break;
        default:
          remainingShiftTime = (tRow.accumulatedTime > 0) ? tRow.limitTime - tRow.accumulatedTime : tRow.limitTime
      }
    })
  }
  return {
    break: remainingBreakTime,
    drive: remainingDriveTime,
    shift: remainingShiftTime,
    cycle: remainingCycleTime,
    recap: 0
  }
}

// const s3Upload = function(params){
//   const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//   });
//   const responses = await Promise.all(
//     params.map(param => s3.upload(param).promise())
//   )
//   console.log(responses)
//   return responses
// }
var https = require('https');
var http = require('http');

https.globalAgent.maxSockets = 5;
http.globalAgent.maxSockets = 5;
const calculteDistance = async (combination) => {
  let lat1 = combination.start_lat;
  let lon1 = combination.start_lng;
  let lat2 = combination.destination_lat;
  let lon2 = combination.destination_lng;
  let unit;


  if ((lat1 === lat2) && (lon1 === lon2)) {

    return 0;

  } else {

    var radlat1 = Math.PI * lat1 / 180;

    var radlat2 = Math.PI * lat2 / 180;

    var theta = lon1 - lon2;

    var radtheta = Math.PI * theta / 180;

    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);

    if (dist > 1) {

      dist = 1;

    }

    dist = Math.acos(dist);

    dist = dist * 180 / Math.PI;

    dist = dist * 60 * 1.1515;

    if (unit === "K") { dist = dist * 1.609344 }

    if (unit === "N") { dist = dist * 0.8684 }

    return Math.round(dist, 2);

  }
  // console.log('combination '+combination.start_lat)
  // //console.log(process.env.GOOGLE_API_KEY)
  // var distance = 0
  // var config = {
  //     method: 'get',
  //     url: `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${combination.start_lat}%2C${combination.start_lng}&destinations=${combination.destination_lat}%2C${combination.destination_lng}&key=${process.env.GOOGLE_API_KEY}`,
  //     headers: { }
  // };

  // // let resultInfo = await 
  // return axios(config)
  //   .then((resultInfo)=>{
  //     console.log("resultOINfo",resultInfo);
  //     console.log(JSON.stringify(resultInfo.data.rows[0]))
  //     if(resultInfo.data.status == 'OK'){
  //         let distanceElements = resultInfo.data.rows[0].elements
  //         distanceElements.forEach((row)=>{
  //             //console.log(row)
  //             distance = (row.distance) ? row.distance.text : 0
  //         })          
  //       }
  //       return distance;
  //   })
  //   .catch((error)=>{
  //     console.log("Error------------>",error);
  //     return distance;
  //   })
}
const calculateCycle = function (Code) {
  switch (Code) {
    case "70H_CYCLE_LIMIT":
      eventCodeText = "USA 70 Hour / 8 Day"
      break;
    case "80H_CYCLE_LIMIT":
      eventCodeText = "California 80 Hour / 8 Day"
      break;
    case "60H_CYCLE_LIMIT":
      eventCodeText = "USA 60 Hour / 7 Day"
      break;
    default:
      eventCodeText = ""
  }
  return eventCodeText
}
function insertAndShift(arr, from, to) {
  let cutOut = arr.splice(from, 1)[0]; // cut the element at index 'from'
  arr.splice(to, 0, cutOut);            // insert it at index 'to'
}
async function convertRegion(input, to) {
  var states = [
    ['Alabama', 'AL'],
    ['Alaska', 'AK'],
    ['American Samoa', 'AS'],
    ['Arizona', 'AZ'],
    ['Arkansas', 'AR'],
    ['Armed Forces Americas', 'AA'],
    ['Armed Forces Europe', 'AE'],
    ['Armed Forces Pacific', 'AP'],
    ['California', 'CA'],
    ['Colorado', 'CO'],
    ['Connecticut', 'CT'],
    ['Delaware', 'DE'],
    ['District Of Columbia', 'DC'],
    ['Florida', 'FL'],
    ['Georgia', 'GA'],
    ['Guam', 'GU'],
    ['Hawaii', 'HI'],
    ['Idaho', 'ID'],
    ['Illinois', 'IL'],
    ['Indiana', 'IN'],
    ['Iowa', 'IA'],
    ['Kansas', 'KS'],
    ['Kentucky', 'KY'],
    ['Louisiana', 'LA'],
    ['Maine', 'ME'],
    ['Marshall Islands', 'MH'],
    ['Maryland', 'MD'],
    ['Massachusetts', 'MA'],
    ['Michigan', 'MI'],
    ['Minnesota', 'MN'],
    ['Mississippi', 'MS'],
    ['Missouri', 'MO'],
    ['Montana', 'MT'],
    ['Nebraska', 'NE'],
    ['Nevada', 'NV'],
    ['New Hampshire', 'NH'],
    ['New Jersey', 'NJ'],
    ['New Mexico', 'NM'],
    ['New York', 'NY'],
    ['North Carolina', 'NC'],
    ['North Dakota', 'ND'],
    ['Northern Mariana Islands', 'NP'],
    ['Ohio', 'OH'],
    ['Oklahoma', 'OK'],
    ['Oregon', 'OR'],
    ['Pennsylvania', 'PA'],
    ['Puerto Rico', 'PR'],
    ['Rhode Island', 'RI'],
    ['South Carolina', 'SC'],
    ['South Dakota', 'SD'],
    ['Tennessee', 'TN'],
    ['Texas', 'TX'],
    ['US Virgin Islands', 'VI'],
    ['Utah', 'UT'],
    ['Vermont', 'VT'],
    ['Virginia', 'VA'],
    ['Washington', 'WA'],
    ['West Virginia', 'WV'],
    ['Wisconsin', 'WI'],
    ['Wyoming', 'WY'],
  ];

  var provinces = [
    ['Alberta', 'AB'],
    ['British Columbia', 'BC'],
    ['Manitoba', 'MB'],
    ['New Brunswick', 'NB'],
    ['Newfoundland', 'NF'],
    ['Northwest Territory', 'NT'],
    ['Nova Scotia', 'NS'],
    ['Nunavut', 'NU'],
    ['Ontario', 'ON'],
    ['Prince Edward Island', 'PE'],
    ['Quebec', 'QC'],
    ['Saskatchewan', 'SK'],
    ['Yukon', 'YT'],
  ];

  var regions = states.concat(provinces);

  if (to == TO_ABBREVIATED) {
    input = input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    for (var region of regions) {
      if (region[0] == input) {
        return (region[1]);
      }
    }
  } else if (to == TO_NAME) {
    input = input.toUpperCase();
    for (var region of regions) {
      if (region[1] == input) {
        return (region[0]);
      }
    }
  }
}
const formatDate = (payload) => {
  
  var startDate = payload.split("/")[0];
  var endDate = payload.split("/")[1];
  var startDateFormatted = new Date(startDate);
  var endDateFormatted = new Date(endDate);

  return {
    startDate, endDate, startDateFormatted, endDateFormatted 
  }
}
const allEventCodes = [
  {
      id:"DS_OFF",
      value:"Off Duty"
  },
  {
      id:"DS_SB",
      value:"Sleeper"
  },
  {
      id:"DS_D",
      value:"Driving"
  },
  {
      id:"DS_ON",
      value:"On Duty"
  },
  {
      id:"DR_IND_YM",
      value:"Yard Move"
  },
  {
      id:"DR_IND_PC",
      value:"Personal Conveyance"
  },
  {
      id:"DR_CERT_1",
      value:"Certification (1)"
  },
  {
      id:"DR_CERT_2",
      value:"Certification (2)"
  },
  {
      id:"DR_CERT_3",
      value:"Certification (3)"
  },
  {
      id:"DR_CERT_4",
      value:"Certification (4)"
  },
  {
      id:"DR_CERT_5",
      value:"Certification (5)"
  },
  {
      id:"DR_CERT_6",
      value:"Certification (6)"
  },
  {
      id:"DR_CERT_7",
      value:"Certification (7)"
  },
  {
      id:"DR_CERT_8",
      value:"Certification (8)"
  },
  {
      id:"DR_CERT_9",
      value:"Certification (>=9)"
  },
  {
      id:"INTER_NORMAL_PRECISION",
      value:"Intermediate w/ CLP"
  },
  {
      id:"INTER_REDUCED_PERCISION",
      value:"Intermediate w/ RLP"
  },
  {
      id:"ENG_UP_NORMAL",
      value:"Engine Power-up w/ CLP"
  },
  {
      id:"ENG_UP_REDUCED",
      value:"Engine Power-up w/ RLP"
  },
  {
      id:"ENG_DOWN_NORMAL",
      value:"Engine Shut-down w/ CLP"
  },
  {
      id:"ENG_DOWN_REDUCED",
      value:"Engine Shut-down w/ RLP"
  },
  {
      id:"DR_LOGIN",
      value:"Login"
  },
  {
      id:"DR_LOGOUT",
      value:"Logout"
  }
  
];
async function checkTimeOverlaps(eventFindCond, eventStartTime){
  let eventData = await HOSEvent.find(eventFindCond).select("eventTime");
  let existingEventTimes = eventData.filter(e=>e.eventTime == eventStartTime)
  if(existingEventTimes.length > 0){
      return false
  }
  return true      
}
async function getHOSEventDetails(id){
  let eventInfo = await HOSEvent.findById(id).populate({
      path:'vehicleId',
      select:{"vehicleNumber":1}
  }).select({
      "manualLocation":1,
      "calculatedLocation":1,
      "recordOrigin":1,
      "eventTime":1,
      "odometer":1,
      "engineHours":1,
      "notes":1,
      "eventStatus":1,
  })
  let eventDetail = eventInfo.toObject()
  eventDetail.id = eventInfo._id
  eventDetail.address = (eventInfo.calculatedLocation) ? eventInfo.calculatedLocation : eventInfo.manualLocation
  eventDetail.vehicleId = (eventInfo.vehicleId) ? eventInfo.vehicleId._id : ""
  eventDetail.vehicleNumber = (eventInfo.vehicleId) ? eventInfo.vehicleId.vehicleNumber : ""
  //eventInfo.duration = (updatedEventInfo.duration && updatedEventInfo.duration > 0) ? getHours(updatedEventInfo.duration) : 0
  return eventDetail
}
function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  let str = '';
  if(hours > 0)
      str += hours + " hours ";
  if(minutes > 0)
      str += minutes + " minutes ";
  if(seconds > 0)
      str += seconds + " seconds ";
  return str;
}
async function sendMailsUsingMailGunWithAttachment(outputData, eldDetail, fileName, uploadedFilePath, recipientEmail) {
  return new Promise(async (resolve, reject) => {
    try {
      const attch = {data: outputData, filename: fileName};
      mg.messages.create(mailGumUrl, {
        from: `<postmaster@${mailGumUrl}>`,
        to: recipientEmail,
        subject: `TEST: ELD records from ${(eldDetail)? eldDetail.eldRegistrationId: 'Mobil'}:${(eldDetail)? eldDetail.eldIdentifier: ''}`,
        text:`${(eldDetail)? eldDetail.outputFileComment: 'attachment'}`,
        attachment:attch
      })
        .then(msg => {
          console.log(msg)
          resolve( { success: true, filepath: uploadedFilePath });
        }).catch(err => {
          console.log(err)
          resolve( { error: err, filepath: uploadedFilePath });
        });
    } catch (error) {
      console.log(error)
      resolve(false);
    }
  });
}
async function sendMailsUsingMailGun(recipientEmail, name, str, Verification) {
  return new Promise(async (resolve, reject) => {
    try {
      let purpose = '';
      (Verification) ? purpose = "verify your account" : purpose = "reset your password";

      mg.messages.create(mailGumUrl, {
        from: `Mailgun Sandbox <postmaster@${mailGumUrl}>`,
        to: recipientEmail,
        subject: `Hello ${name}`,
        html: `<!DOCTYPE> 
              <html>
                <body>
                  <p>Hello,<br> Please Click on the link to ${purpose}.<br><a href=${str}>Click here</a></p>
                </body>
              </html>`
      })
        .then(msg => {
          resolve(true);
        }).catch(err => {
          resolve(false);
        });
    } catch (error) {
      resolve(false);
    }
  });
}
function getLastTwoWeeksDate(currentDate) {
  const NUM_OF_DAYS = 14;
  let dates = [];
  for (let i = 0; i <= NUM_OF_DAYS; i++) {
      let date = moment(currentDate).utcOffset(0, false).subtract(i, 'day');
      dates.push(date);
  }
  return dates.reverse();
}
async function checkLogsOvertime(eventFindCond, eventStartTime) {
  let eventData = await HOSEvent.find(eventFindCond).select("eventDateTime");
  const DAY_UNIT_IN_MILLISECONDS = 24 * 3600 * 1000
  let existingEventTimes = eventData.filter(e => ((new Date(e.eventDateTime).getTime() - new Date(eventStartTime).getTime()) / DAY_UNIT_IN_MILLISECONDS) == 0)
  if (existingEventTimes.length > 0) {
      return false
  }
  return true
}

function getDateWithoutTime(date){
  var time = moment(date).utcOffset(0);
  time.set({hour:0,minute:0,second:0,millisecond:0})
  time = time.toISOString();
  return time;
}

module.exports = {
  isEmailValid,
  hashPassword,
  matchPassword,
  encodeToken,
  sendSesEmail,
  makeRandomString,
  ensureAuthenticated,
  dynamicSort,
  getHours,
  tokenAuthorization,
  authenticateUserLoginToken,
  authenticateDriverLoginToken,
  formatedDate,
  getEventCode,
  getTimeZoneList,
  get_time_diff,
  isoDateWithoutTimeZone,
  generatePDF,
  generateCSV,
  calculateDriverHOS,
  secondsToHms,
  //s3Upload,
  calculteDistance,
  calculateCycle,
  insertAndShift,
  convertRegion,
  formatDate,
  allEventCodes, 
  checkTimeOverlaps, 
  getHOSEventDetails,
  msToTime,
  sendMailsUsingMailGunWithAttachment,
  sendMailsUsingMailGun,
  getLastTwoWeeksDate,
  checkLogsOvertime,
  getDateWithoutTime
}