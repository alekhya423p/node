const errorFunction = (errorBit, msg) => {
     return { 
        success: errorBit, 
        message: msg
    };
};
module.exports = errorFunction;