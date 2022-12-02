const { getSuccessResponse } = require("../helper/success");
const { formatDate, formatedDate } = require("../helper/utils");
const FMCSA = require("../Models/FMCSARecordsModel");
const initFMCSAController = () => {
    const getFMCSAReports = async (req, res) => {
        const { id, companyId, searchKey, searchDate } = req.query;
        try {
            let findCond = { isDeleted: false, companyId: companyId }
            if (searchDate) {
                const { startDateFormatted, endDateFormatted } = formatDate(searchDate);
                findCond.createdAt = { $gte: startDateFormatted, $lte: endDateFormatted }
            }
            let recordList = await FMCSA.find(findCond).populate({
                path: 'driverId',
                select: { "firstName": 1, "lastName": 1 }
            }).populate({
                path: 'vehicleId',
                select: { "vehicleNumber": 1 }
            })
            console.log("recordList = ", recordList);
            if (recordList.length == 0) {
                const { statusCode, body } = getSuccessResponse({list:[],count:0}, "No Records found!", false);
                return res.status(statusCode).send(body);
            }
            // if records are found! 
            let list = []
            recordList.map((singleRecord) => {
                list.push({
                    driverName: singleRecord.driverId.firstName + ' ' + singleRecord.driverId.lastName,
                    vehicleNumber: singleRecord.vehicleId.vehicleNumber,
                    reportCreatedAt: formatedDate(singleRecord.createdAt, 2),
                    fileName: singleRecord.fileName,
                    fileUrl: singleRecord.file,
                    status: singleRecord.status
                })
            })
            let filteredList = []
            if (searchKey) {
                filteredList = list.filter(e => e.driverName == searchKey)
            }
            //console.log(filteredList)
            let resultObj = {
                list: (searchKey) ? filteredList : list,
                count: (searchKey) ? filteredList.length : list.length,
            }
            const {statusCode,body} = getSuccessResponse(resultObj, "FMCSA report fetched successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500)
        }
    }
    const getFMCSATransferLogsSystem = async (req, res) =>{
        try{
            let query = {}
    
            let result = await FMCSA.find(query).populate({
                path: 'driverId',
                select: { "firstName": 1, _id: 1, lastName: 1 }
            }).populate({
                path: 'vehicleId',
                select: { "vehicleNumber": 1, _id: 1 }
            }).populate({
                path: 'companyId',
                select: { "companyName": 1, _id: 1 }
            });
            const{statusCode , body} =  getSuccessResponse(result, `FMCSA Records`, true);
            return res.status(statusCode).send(body);
        }catch(error){
            console.log(error)
        }
    }
    return {
        getFMCSAReports,
        getFMCSATransferLogsSystem
    }
}

module.exports = initFMCSAController;