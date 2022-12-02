require("dotenv").config();
const mongoose = require("mongoose");

const connectToDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.DB_URL_LOCAL);
        console.log("connected to database -", connection.connections[0].name);
    }catch(err) {
        console.log(err);
    }
}

module.exports = connectToDB;
