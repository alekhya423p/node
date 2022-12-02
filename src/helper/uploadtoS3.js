const AWS = require('aws-sdk');
const IFTARecord = require('../Models/IFTARecordsModel');
const { getSuccessResponse } = require('./success');
const fs  = require("fs");
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const uploadToS3 = (fileArr, pdfFilePath, csvFilePath, recordId) => {
    return new Promise((resolve, reject) => {
        //upload csv to aws s3 bucket
        var ResponseData = [];
        var resFiles = {}
        fileArr.map((params) => {
            s3.upload(params, async (err, data) => {
                if (err) {
                    console.log('error', err);
                    reject(getSuccessResponse({}, "Unable to create report.", false));
                } else {

                    var fileExtSec = data.Location.split('/')
                    var fileExt = fileExtSec.reverse()[0].split('.')[1]
                    if (fileExt == 'csv') {
                        fs.unlinkSync(csvFilePath);
                        resFiles.csvUrl = data.Location
                    }
                    if (fileExt == 'pdf') {
                        fs.unlinkSync(pdfFilePath);
                        resFiles.pdfUrl = data.Location
                    }
                    ResponseData.push(data);
                    if (ResponseData.length == fileArr.length) {
                        let updRes = await IFTARecord.updateOne({ _id: recordId }, { $set: { csvUrl: resFiles.csvUrl, pdfUrl: resFiles.pdfUrl, status: "Processed" } })
                        if (updRes.modifiedCount > 0) {
                            resolve(getSuccessResponse({}, "Report generated successfully", true));
                        }
                    }
                }
            })
        })

    })
}

module.exports = uploadToS3;