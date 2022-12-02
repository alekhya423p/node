const { ApiResponse } = require("../helper/success");
const Resource = require("../Models/ResourceModel");

const initResourcesController = () => {

    const getResourceList = async (req, res) => {
        try {
            let query = { resource_title: { $ne: 'Installation' }}
            let result = await Resource.find(query).populate({
                path: 'driverId',
                select: { "firstName": 1, "lastName": 1, "licenseNumber": 1 }
            }).populate('companyId');
            
            return res.status(200).json(ApiResponse(result, "Resource list Fetch succussfully.", true))
        } catch (error) {
            console.log(error)
            return res.status(500).json(ApiResponse({}, "Something went wrong!", true))

        }
    }
    return {
        getResourceList,
    }
}

module.exports = initResourcesController;