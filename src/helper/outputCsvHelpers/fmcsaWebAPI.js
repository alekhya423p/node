require("dotenv").config()

const axios = require('axios');
var fs = require('fs');
const csvParser = require('csv-parser');
const os = require("os");

// get temp directory
const tempDir = os.tmpdir()
const https = require('https');
const api_url = "https://eldws.fmcsa.dot.gov/api/v2/fmcsa";
var mimemessage = require('mimemessage');
const AWS = require('aws-sdk');
const { sendMailsUsingMailGunWithAttachment } = require('../utils');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
// const { deleteCsvFile } = require('./csvGenrator');
const recipientEmail = process.env.RECIPIENT_EMAIL;
const senderEmail = "jitendertanwar@virtualemployee.com"; //TODO Need to change email
const SES_CONFIG = {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION,
};
const AWS_SES = new AWS.SES(SES_CONFIG);
module.exports.validateEldOutputFile = validateEldOutputFile;
function validateEldOutputFile(eldDetail, fileName, type, filePath) {
    var outputData = "";
    return new Promise((resolve, reject) => {
        // let filePath = `${tempDir}/${fileName}`;
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on("data", function (row) {
                let values = Object.values(row);
                outputData = outputData + values + '\n'
            })
            .on("end", async function () {
                let uploadedFilePath = await uploadCSVAtS3Bucket(filePath, fileName);
                // , deleteCsvFile(`${tempDir}/${fileName}`)
                if (type == "webservice") {
                    transferDataToWebService(outputData, eldDetail, fileName, uploadedFilePath)
                        .then(res => {
                            console.log("validated fmcsa logs");
                            deleteCsvFile(filePath)
                        })
                        .catch(err => {
                            console.error(err);
                            deleteCsvFile(filePath)
                        });
                        // should be updated 
                        resolve({
                            filePath : filePath
                        })
                }
                else {
                    resolve(sendMailsUsingMailGunWithAttachment(outputData, eldDetail, fileName, uploadedFilePath, [recipientEmail]), deleteCsvFile(`${tempDir}/${fileName}`));
                }
            })
            .on("error", function (error) {
                console.log("error in creating the file for stream , ", error.message);
            });
    })
}

async function transferDataToWebService(outputData, eldDetail, fileName, uploadedFilePath) {


    const httpsAgent = await getHttpAgentCertificate(eldDetail.eldAuthenticationValue);

    var data = `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="//www.fmcsa.dot.gov">
        <soap12:Header xmlns:rfp="http://www.w3.org/2005/08/addressing">
            <rfp:Action>http://www.fmcsa.dot.gov/schemas/FMCSA.ELD.Infrastructure/IELDSubmissionService/Submit</rfp:Action>
            <wsse:Security soap12:mustUnderstand="0" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"/>
        </soap12:Header>
      <soap12:Body>
        <Submit xmlns="http://www.fmcsa.dot.gov/schemas/FMCSA.ELD.Infrastructure">
          <data>
            <ELDIdentifier>${eldDetail.eldIdentifier}</ELDIdentifier>
            <ELDRegistrationId>${eldDetail.eldRegistrationId}</ELDRegistrationId>
            <OutputFileBody>${outputData}</OutputFileBody>
            <OutputFileComment>${eldDetail.outputFileComment}</OutputFileComment>
            <OutputFilename>${fileName}</OutputFilename>
            <Version>${"V1"}</Version>
            <Test>${"FALSE"}</Test>
          </data>
        </Submit>
       </soap12:Body>
    </soap12:Envelope>
`;
    // const deleted = deleteCsvFile(fileName);
    var config = {
        method: 'post',
        url: 'https://eldws.fmcsa.dot.gov/ELDSubmissionService.svc',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'SOAPAction': 'http://www.fmcsa.dot.gov/schemas/FMCSA.ELD.Infrastructure/IELDSubmissionService/Submit'
        },
        httpsAgent,
        data: data
    };
    return new Promise((resolve, reject) => {
        axios(config)
            .then(function (response) {
                resolve({
                    data: response.data,
                    filepath: uploadedFilePath
                });
            })
            .catch(function (error) {
                reject({})
            });
    })

}

function deleteCsvFile(file) {
    fs.unlink(file, function (err) {
        if (err) {
            throw err
        } else {
            console.log("Successfully deleted the file.")
        }
    })
    return
}

async function getObject(bucket, objectKey) {
    try {
        const params = {
            Bucket: bucket,
            Key: objectKey
        }
        const data = await s3.getObject(params).promise();
        return data.Body.toString('utf-8');
    } catch (e) {
        throw new Error(`Could not retrieve file from S3: ${e.message}`)
    }
}

async function getHttpAgentCertificate(authenticateKey) {
    //let inputPath = __dirname + `/certificates/`;
    return new https.Agent({
        // cert: fs.readFileSync(`${inputPath}public_certificate.crt`),
        // key: fs.readFileSync(`${inputPath}private.key`),
        cert: await getObject('certificatefmcsa', 'public_certificate.crt'),
        key: await getObject('certificatefmcsa', 'private.key'),
    });
}
async function uploadCSVAtS3Bucket(filePath, fileName) {
    try {
        const csvFileContent = fs.readFileSync(`${tempDir}/${fileName}`)
        let params = {
            Bucket: 'fmcsa.csv',
            Key: fileName,
            Body: csvFileContent
        }

        return new Promise((resolve, reject) => {
            s3.upload(params, async (err, data) => {
                if (err) {
                    console.log('error', err);
                } else {
                    console.log(data)
                    resolve(data.Location);
                    console.log("upload csv completed");
                }
            })
        })
    } catch (error) {
        console.log(error);
    }

}

async function sendOutputFileByMailExpectMailInBody(fileName, fromMail) {
    try {
        let filePath = `${tempDir}/${fileName}`;
        var mailContent = mimemessage.factory({ contentType: 'multipart/mixed', body: [] });
        mailContent.header('From', fromMail);
        mailContent.header('To', recipientEmail);
        mailContent.header('Subject', `TEST: ELD records from:`);
        // var plainEntity = mimemessage.factory({
        //     body: [eldDetail.outputFileComment]
        // });
        // mailContent.body.push(plainEntity);
        outputData = fs.readFileSync(filePath);
        var attachmentEntity = mimemessage.factory({
            contentType: 'application/pdf',
            body: outputData
        });
        console.log(outputData)
        attachmentEntity.header('Content-Disposition', `attachment; filename=${fileName}`);
        mailContent.body.push(attachmentEntity);
        return new Promise((resolve, reject) => {
            return AWS_SES.sendRawEmail({
                RawMessage: { Data: mailContent.toString() }
            }, (err, sesdata, res) => {
                console.log("err", err);
                console.log("Res", sesdata);
                console.log("res", res);
                resolve({
                    filepath: 'uploadedFilePath'
                });
                return sesdata;
            });
        })
    } catch (error) {
        console.log("Error-->", error);
        return error;
    }
}

module.exports.sendOutputFileByMailExpectMailInBody = sendOutputFileByMailExpectMailInBody;