const joi = require("joi");

exports.generateOutputCSVValidator = joi.object({
    
        id: joi.string().length(24).required(),
        comment: joi.string().allow("").optional(),
        type: joi.string().valid("webservice", "email").required(),
        startDate: joi.date().required(),
        endDate: joi.date().required()
    
})