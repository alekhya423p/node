const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required:[true,'Please add company id'],
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required:[true,'Please add driver id'],
    },
    resource_title: {
        type: String,
        required: true
    },
    resource_description: {
        type: String,
        required: true
    },
    resource_filepath: {
        type: String,
        required: true
    },
    date: {
        type: Date,
    },
},
    {
        timestamps: true,
    })
const Resource = mongoose.model("resources", resourceSchema);
module.exports = Resource;


