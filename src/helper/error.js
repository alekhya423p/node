const getErrorResponse = (info) => {
    console.log(info);
    return {
      statusCode: info.statusCode || 500,
      // headers: {
      //   'Content-Type': 'text/plain',
      //   'Access-Control-Allow-Origin': '*',
      //   'Access-Control-Allow-Credentials': true,
      // },
      body: info.body,
    };
  };
  
  module.exports = { getErrorResponse };
  