
const getDriverCSVDetails = require("../helper/outputCsvHelpers/outputCsv.helpers");
const DriverModel = require("../Models/DriverModel");
const csvFileGenerator = require("../helper/outputCsvHelpers/csvGenrator");
const FMCSARecord = require("../Models/FMCSARecordsModel");
const HOSEvent = require("../Models/HOSEventsModel");
const _ = require("lodash");
const { getSuccessResponse } = require("../helper/success");
var convert = require('xml-js');

const initOutputCSVController = () => {
    const generateOutputCSV = async (req, res) => {
        const body = req.body;
        try {

            let driversCsvDetails = await getDriverCSVDetails(DriverModel, body);
            
            if (_.isEmpty(driversCsvDetails)) {
                const { statusCode, body } = getSuccessResponse({}, `HOS events not available`, true);
                return res.status(statusCode).send(body);
            }
            let sendResponse = await csvFileGenerator.outputFileCsvGenerator(driversCsvDetails, body);
         
            await HOSEvent.updateMany({ driverId: body.id, logDate: { $gte: new Date(body.startDate), $lte: new Date(body.endDate) } }, { $set: { inspection: true } })
            let userName = ''
            userName = driversCsvDetails[0].usersList && driversCsvDetails[0].usersList.firstName.toUpperCase();
            let timeStamp = new Date().getTime();
            timeStamp = timeStamp.toString().split("").reverse().join("").slice(0, 10)
            const fileName = `${userName}_${timeStamp}-0000000.csv`;
            let driverDetails = await DriverModel.findOne({ _id: body.id })
            let newRecord = {
                displayId: driverDetails?.displayId,
                companyId: driverDetails?.companyId,
                driverId: body.id,
                vehicleId: driverDetails?.assignedVehicleId,
                comment: body.comment,
                fileName: fileName,
                file: sendResponse.filepath,
                createdBy: body.id,
                requestType: ''
            }
            if (body.type == 'webservice') {
                newRecord.requestType = 'WEB_TRANSFER_DATA'
            } else {
                newRecord.requestType = 'MOBILE_TRANSFER_DATA'
            }
            const fmcsaRecord = new FMCSARecord(newRecord);
            await fmcsaRecord.save();

            if (!sendResponse) {
                const { body } = getSuccessResponse({}, `Email has not been sent`, true);
                return res.status(403).send(body);
            }
            if (sendResponse && sendResponse.success) return getSuccessResponse(sendResponse, `Email has been sent`, true);
            if (sendResponse && sendResponse.error) return getSuccessResponse(sendResponse, `Email has not been sent`, true);;
            var convertedResult = convert.xml2json(sendResponse.data, { compact: true, spaces: 4 });
            const parseResult = JSON.parse(convertedResult)
            if (parseResult['s:Envelope'] && parseResult['s:Envelope']['s:Body'] && parseResult['s:Envelope']['s:Body']['SubmitResponse']['SubmitResult']['Errors']['b:ValidationError']) {
                return getSuccessResponse({ data: parseResult, filepath: sendResponse.filepath }, `File Validation Failed`, true);
            } else {
                return getSuccessResponse({ data: parseResult, filepath: sendResponse.filepath }, `File Validation Successfully`, true);
            }
        } catch (error) {
            console.log(error);
            return error;
        }

    }
    return {
        generateOutputCSV
    }
}

module.exports = initOutputCSVController;