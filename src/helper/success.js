const getSuccessResponse = (info,message,status,token) => {
    
    let obj = {
      message: message,
      data: info,
      success: status,
    };
    if(token)
      obj.token = token;
    return {
      statusCode: 200,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Access-Control-Allow-Origin': '*',
    //     'Access-Control-Allow-Credentials': true,
    //   },
      body: obj,
    
    };
  };
  
  const getAuthorizedResponse = (info,message,status,token) => {
    let obj = {
      message: message,
      success: status,
    };
    if(token)
      obj.token = token;
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(obj),
    };
  };
  
  const getAlreadyLoginResponse = (info,message,status,token) => {
    let obj = {
      message: message,
      success: status,
    };
    if(token)
      obj.token = token;
    return {
      statusCode: 406,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(obj),
    };
  };
  
  const getValidationResponse = (info,message,status,token) => {
    let obj = {
      message: message,
      success: status,
    };
    if(info) obj.error = info.error;
    if(token)
      obj.token = token;
    return {
      statusCode: 422,
      // headers: {
      //   'Content-Type': 'application/json',
      //   'Access-Control-Allow-Origin': '*',
      //   'Access-Control-Allow-Credentials': true,
      // },
      body: obj,
    };
  };
  
  const getUnableResponse = (info,message,status,token) => {
    let obj = {
      message: message,
      success: status,
    };
    if(token)
      obj.token = token;
    return {
      statusCode: 417,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(obj),
    };
  };
  
  const getExistResponse = (info,message,status,token) => {
    let obj = {
      message: message,
      success: status,
    };
    if(token)
      obj.token = token;
    return {
      statusCode: 409,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(obj),
    };
  };
  const ApiResponse = (body, message, statusCode) => {
      return {
        message : message, 
        data : body,
        success : statusCode
      }
  }
  module.exports = { getSuccessResponse,
                     getAuthorizedResponse,
                     getValidationResponse,
                     getUnableResponse,
                     getExistResponse,
                     getAlreadyLoginResponse,
                     ApiResponse };
                     