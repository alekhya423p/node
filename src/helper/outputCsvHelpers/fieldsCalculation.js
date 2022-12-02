'use strict';
const _ = require('lodash');
const fileDataCheckBinary = "1001011010011100";

const vinCharacterMapping = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9
}

const multiplyByPlacementMapping = [
    8, 7, 6, 5, 4, 3, 2, 10, 0, 9,  8,  7,  6,  5,  4,  3,  2,
]


module.exports.dataCheckConverstion = dataCheckConverstion;
module.exports.calculateVinNumber = calculateVinNumber;
module.exports.calculateFileDataCheckValue = calculateFileDataCheckValue;
module.exports.getSeqIdInHexaString = getSeqIdInHexaString;

function dataCheckConverstion(detail, dataCheckValue) {
    delete detail.companyTimeZoneId;
    let allCharcetrAscii = []
    for (var key in detail) {
        if (detail.hasOwnProperty(key)) {
            var values = detail[key];
            if (values) {
                values = values.toString().split("");
                _.forEach(values, (character) => {
                    allCharcetrAscii.push(character.charCodeAt(0));
                })
            }
        }
    }
    allCharcetrAscii = _.map(allCharcetrAscii, ascii => ascii - 48);
    allCharcetrAscii = _.filter(allCharcetrAscii, ascii => ascii >= 0);
    var decimalAsciiCharacter = _.sum(allCharcetrAscii);
    var binaryValue = convertToBinary(decimalAsciiCharacter);
    binaryValue = leftCircularRotateThreeTime(binaryValue, true);
    var digit1 = parseInt(binaryValue, 2);
    var digit2 = parseInt(dataCheckValue, 2);
    let xorValue = digit1 ^ digit2;
    let xorHexaDecimal = xorValue.toString(16).toUpperCase();
    if(xorHexaDecimal.length == 1) xorHexaDecimal = "0" + xorHexaDecimal;
    return xorHexaDecimal;
}

// program to convert decimal to binary
function convertToBinary(x) {
    let bin = 0;
    let rem, i = 1, step = 1;
    while (x != 0) {
        rem = x % 2;
        x = parseInt(x / 2);
        bin = bin + rem * i;
        i = i * 10;
    }
    return bin;
}


function calculateFileDataCheckValue(csvDetailsList, singleSegments) {
    let totalLineDataCheckValue = 0;
    let allDecimalValues = []
    for (var key in csvDetailsList) {
        let detail = csvDetailsList[key];
        for( let objectKey in detail) {
            if (detail[objectKey].lineDataCheck) {
                allDecimalValues.push(parseInt(detail[objectKey].lineDataCheck, 16));
            }
        }
    }
    totalLineDataCheckValue = _.sum(allDecimalValues);
    totalLineDataCheckValue = singleSegments.headerSegmentData.driverLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.driverLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.coDriverLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.coDriverLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.powerUnitLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.powerUnitLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.carierLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.carierLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.shippingLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.shippingLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.timeplaceLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.timeplaceLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.headerSegmentData.eldIDLine()[0].lineDataCheck ? parseInt(singleSegments.headerSegmentData.eldIDLine()[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.usersListSegment[0].lineDataCheck ? parseInt(singleSegments.usersListSegment[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    totalLineDataCheckValue = singleSegments.cmvListSegment[0].lineDataCheck ? parseInt(singleSegments.cmvListSegment[0].lineDataCheck, 16) + totalLineDataCheckValue : totalLineDataCheckValue;
    
    let binaryCode = totalLineDataCheckValue.toString(2);
    
    if(binaryCode.length < 16) binaryCode = binaryCode.padStart(16,'0');
    else binaryCode = binaryCode.substr(-16);
    let binaryCodeLeftSide = binaryCode.slice(0, 8);
    let binaryCodeRightSide = binaryCode.slice(8, 16);
    binaryCodeLeftSide = leftCircularRotateThreeTime(binaryCodeLeftSide, false)
    binaryCodeRightSide = leftCircularRotateThreeTime(binaryCodeRightSide, false)
    let totalCircularSift = binaryCodeLeftSide + binaryCodeRightSide;
    var digit1 = parseInt(totalCircularSift, 2);
    var digit2 = parseInt(fileDataCheckBinary, 2);
    let xorValue = digit1 ^ digit2;
    let xorHexaDecimal = xorValue.toString(16).toUpperCase();
    if(xorHexaDecimal.length <= 2) xorHexaDecimal = "0"+ xorHexaDecimal;
    console.log("xorHexaDecimal--->",xorHexaDecimal);
    // {heading: `="${';'}"`}
    return [{heading: xorHexaDecimal}];
}

//left circular rotation on binary
function leftCircularRotateThreeTime(binaryCode) {
    binaryCode = binaryCode.toString();
    if(binaryCode.length < 9)  binaryCode = binaryCode.padStart(8,'0');
    else binaryCode = binaryCode.substr(-8);

    const getShiftedString = (binaryCode, leftShifts, rightShifts) => {
        return shiftByAmount(shiftByAmount(binaryCode, leftShifts), -rightShifts)
    };
    const shiftByAmount = (str, leftShifts) => {
        leftShifts = leftShifts % str.length;
        return str.slice(leftShifts) + str.slice(0, leftShifts);
    };
    binaryCode = getShiftedString(binaryCode, 3, 2);
    binaryCode = getShiftedString(binaryCode, 3, 2);
    binaryCode = getShiftedString(binaryCode, 3, 2);
    return binaryCode;
}

function getSeqIdInHexaString(seqId){
    let allCharcetrAscii = []
    seqId = seqId.toString().split("");
    _.forEach(seqId, (character) => {
        allCharcetrAscii.push(character.charCodeAt(0));
    })
    allCharcetrAscii = _.map(allCharcetrAscii, ascii => ascii - 48);
    allCharcetrAscii = _.filter(allCharcetrAscii, ascii => ascii >= 0);
    var decimalAsciiCharacter = _.sum(allCharcetrAscii);
    return decimalAsciiCharacter.toString(16);
}


function calculateVinNumber(vin) {
    let oldVinValue = vin;
    var validateVinRegx = /^(?!.*i|.*q|.*o|.*I|.*Q|.*O).*$/;
    if(vin.length != 17) return false;
    vin = vin.toUpperCase();
    if(!validateVinRegx.test(vin)) return false;
    vin = vin.split('');
    // Multiply each numeric equivalent (or numeric digit) based on its placement in the VIN.
    vin = _.map(vin, (character, index) => {
        if(isNaN(character)){
            return vinCharacterMapping[character];
        }
        return character;
    });
    vin = _.map(multiplyByPlacementMapping, (value, index)=>{
        return +vin[index] * value;
    })
    vin = _.sum(vin);
    vin = vin % 11;
    if(oldVinValue.charAt(8) == vin ) return true;
    return false;
}

