require("dotenv").config();
const errorFunction = require("../helper/errorFunction");
const { getSuccessResponse } = require("../helper/success");
const { formatedDate, convertRegion, generatePDF } = require("../helper/utils");
const IFTARecord = require("../Models/IFTARecordsModel");
const limit = parseInt(process.env.WEB_LIMIT);
const promise = require("bluebird");
const createQuery = require("../helper/createQuery");
const TO_NAME = 1;
const fs = require('fs');
const AWS = require('aws-sdk');
const path = require('path');
const uploadToS3 = require("../helper/uploadtoS3");

const initIFTARecordsController = () => {
    const getIFTAReports = async (req, res) => {
        const { companyId, page } = req.query;
        try {
            let findCond = { isDeleted: false, companyId: companyId }
            const total = await IFTARecord.countDocuments(findCond);
            if (total == 0) {
                const { statusCode, body } = getSuccessResponse({reports : []}, "No Records found!", false);
                return res.status(statusCode).send(body);
            }
            var skip = 0
            if (page && (page > 0)) {
                skip = (parseInt(page) - 1) * limit
            }
            let records = await IFTARecord.find({ isDeleted: false }).populate({
                path: 'vehicles.vehicleId',
                select: { "vehicleNumber": 1, "vin": 1 }
            }).limit(limit).skip(skip).sort({ createdAt: -1 })

            var count = records.length
            let list = [];
            if (records.length > 0) {
                records.map(row => {
                    var vehicleStr = ''
                    if (row.vehicles.length > 0) {
                        var c = 0
                        row.vehicles.map((vehicle) => {
                            c++
                            if (row.vehicles.length == c) {
                                vehicleStr += vehicle.vehicleId.vehicleNumber
                            } else {
                                vehicleStr += vehicle.vehicleId.vehicleNumber + ','
                            }
                        })
                    }
                    list.push({
                        id: row.id,
                        displayId: row.displayId,
                        vehicles: vehicleStr,
                        fromDate: formatedDate(new Date(row.fromDate), 3),
                        toDate: formatedDate(new Date(row.toDate), 3),
                        createdAt: formatedDate(new Date(row.createdAt), 2),
                        status: row.status,
                        active: row.isActive
                    })
                })
            }
            var resultData = {
                "reports": list,
                "totalPages": Math.ceil(total / limit),
                "count": count,
                "totalRecord": total
            };
            const { statusCode, body } = getSuccessResponse(resultData, "Fetched Successfully", true);
            return res.status(statusCode).send(body);
        }
        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Could not fetch Records"));
        }
    }
    const getDetails = async (req, res) => {
        const { searchKey, reportId } = req.query;
        try {
            let recordDetail = await IFTARecord.findById(reportId)
                .populate({
                    path: 'vehicles.vehicleId',
                    select: { "vehicleNumber": 1, "vin": 1 }
                });
            if (!recordDetail) {
                const { body } = getSuccessResponse({}, "Invalid report id", false);
                return res.status(404).send(body)
            }
            let links = {
                pdfUrl: recordDetail.pdfUrl,
                csvUrl: recordDetail.csvUrl
            }
            let vehicles = recordDetail.vehicles
            let list = []
            var allTotalDistance = 0
            vehicles.map((singleVehicle) => {
                allTotalDistance = allTotalDistance + parseInt(singleVehicle.totalDistance)
                list.push({
                    vehicleId: singleVehicle.vehicleId._id,
                    vehicleNumber: singleVehicle.vehicleId.vehicleNumber,
                    totalDistance: singleVehicle.totalDistance,
                })
            })
            let filteredList = []
            var filteredTotalDistance = 0
            if (searchKey) {
                filteredList = list.filter(e => e.vehicleNumber == searchKey)
                if (filteredList.length > 0) {
                    filteredList.map((row) => {
                        filteredTotalDistance = filteredTotalDistance + parseInt(row.totalDistance)
                    })
                }
            }
            let resultObj = {
                reportLinks: links,
                vehicles: (searchKey) ? filteredList : list,
                count: (searchKey) ? filteredList.length : list.length,
                totalMiles: (searchKey) ? filteredTotalDistance : allTotalDistance
            }
            const { statusCode, body } = getSuccessResponse(resultObj, "Vehicle list fetched successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Details not found"))
        }
    }
    const getIFTAVehicleReport = async (req, res) => {
        const { recordId, vehicleId } = req.params;
        const { id, searchKey, companyId } = req.query;
        try {
            let recordDetail = await IFTARecord.findById(recordId).populate({
                path: 'vehicles.vehicleId',
                select: { "vehicleNumber": 1, "vin": 1 }
            });
            if (!recordDetail) {
                const { body } = getSuccessResponse({}, "Invalid report id", false);
                return res.status(404).send(body)
            }
            let links = {
                pdfUrl: recordDetail.pdfUrl,
                csvUrl: recordDetail.csvUrl
            }
            let vehicles = recordDetail.vehicles
            let list = []
            vehicles.map((singleVehicle) => {
                var singleVehicleId = singleVehicle.vehicleId._id
                if (singleVehicleId.equals(vehicleId)) {
                    list = singleVehicle.perStateDistance
                }
            })
            list = JSON.parse(JSON.stringify(list));
            const arrWithlist = await promise.map(list, async (object) => {
                return { ...object, stateName: await convertRegion(object.state, TO_NAME) };
            });

            let filteredList = []
            if (searchKey) {
                filteredList = arrWithlist.filter(e => e.state == searchKey)
            }

            let resultObj = {
                list: (searchKey) ? filteredList : arrWithlist,
                reportLinks: links
            }
            const { statusCode, body } = getSuccessResponse(resultObj, "Vehicle report fetched successfully", true);
            return res.status(statusCode).send(body);
        } catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Report not fetched"))
        }
    }
    const createReport = async (req, res) => {
        const { companyId } = req.query;
        const { calculateStatewiseDistance } = createQuery();
        const { vehicleIds, startDate, endDate } = req.body;
        try {
            let vehicleArr = await calculateStatewiseDistance(vehicleIds, startDate, endDate);
            let recordObj = new IFTARecord({
                companyId: companyId,
                fromDate: new Date(startDate),
                toDate: new Date(endDate),
                timeSubmitted: new Date(),
                vehicles: vehicleArr
            })
            let createRecord = await recordObj.save()
            const recordId = createRecord._id
            let records = []
            let pdfRecords = []
            if (recordId) {
                let recordDetails = await IFTARecord.findOne({ isDeleted: false, _id: recordId }).populate({
                    path: 'vehicles.vehicleId',
                    select: { "vehicleNumber": 1 }
                })
                recordDetails.vehicles.map((row) => {
                    pdfRecords.push({
                        vehicleNumber: row.vehicleId.vehicleNumber,
                        totalDistance: row.totalDistance
                    })
                    records.push([row.vehicleId.vehicleNumber, row.totalDistance])
                })
            }
            if (records.length == 0) {
                await IFTARecord.updateOne({ _id: recordId }, { $set: { isDeleted: true } });
                const { body } = getSuccessResponse({}, "No records found to generate report", false);
                return res.status(404).send(body);
            }
            // if records are found
            let { pdfFilePath, assetsPath } = await generatePDF({ Heading: 'IFTA Report', records: pdfRecords });


            let fileArr = []
            if (pdfFilePath) {
                const pdfFilename = 'IFTA_records' + Math.floor((new Date()).getTime() / 1000) + '.pdf';
                const pdfFileContent = fs.readFileSync(pdfFilePath);

                fileArr.push({ Bucket: 'lucid.reports', Key: pdfFilename, Body: pdfFileContent, ContentEncoding: 'base64', ContentType: "application/pdf" })

            }
            const createCsvWriter = require('csv-writer').createArrayCsvWriter;
            const pathOfCSVFileToCreate = path.join(assetsPath, "IFTAReport.csv");

            const csvWriter = createCsvWriter({
                header: ['Vehicle Number', 'Total Distance'],
                path: pathOfCSVFileToCreate
            });
            csvWriter.writeRecords(records)
                .then(async () => {
                    //check file exists or not
                    if (!fs.existsSync(pathOfCSVFileToCreate)) {
                        const { body } = getSuccessResponse({}, "File does not exists", false);
                        return res.status(404).send(body);
                    }
                    const csvFilename = 'IFTA_records' + Math.floor((new Date()).getTime() / 1000) + '.csv';
                    const csvFileContent = fs.readFileSync(pathOfCSVFileToCreate)

                    fileArr.push({
                        Bucket: 'lucid.reports',
                        Key: csvFilename,
                        Body: csvFileContent
                    })
                    uploadToS3(fileArr, pdfFilePath, pathOfCSVFileToCreate, recordId)
                        .then(({ statusCode, body }) => {
                            return res.status(statusCode).send(body)
                        })
                        .catch(({ body }) => {
                            return res.status(403).send(body);
                        })
                })

        }

        catch (err) {
            console.error(err);
            res.status(500).json(errorFunction(false, "Record not added!"))
        }
    }
    
    return {
        getIFTAReports,
        getDetails,
        getIFTAVehicleReport,
        createReport
    }
}

module.exports = initIFTARecordsController;