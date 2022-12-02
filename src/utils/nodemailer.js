require("dotenv").config();
const nodemailer = require("nodemailer");
const { createTransport } = nodemailer;

module.exports = async function sendEmail(toEmail, subject, content) {

    const transporter = createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_ID_PASSWORD
        }
    })
    
    const mailOptions = {
        from: process.env.MAIL_ID,
        to: toEmail,
        subject: subject,
        html: content
    }
    return new Promise((resolve, reject)=> {
        transporter.sendMail(mailOptions, async function (err, message) {
            if(err) {
                console.log(err);
                reject(false);
            }else{
                resolve(true);
            }
        });
    })
    
}