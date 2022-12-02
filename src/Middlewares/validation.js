const errorFunction = require("../helper/errorFunction");
const { ensureAuthenticated } = require("../helper/utils");
const jwt_decode = require('jwt-decode');
const UserModel = require("../Models/UserModel");
const { getSuccessResponse } = require("../helper/success");
// joi validation
exports.customValidation = (joiValidator, payloadType) => {
    // payload type can be body or query as of now
    return (req, res, next) => {
        const payload = req[payloadType]
        const { error } = joiValidator.validate(payload);
        if (error) {
            res.status(403);
            return res.json(
                errorFunction(false, error.message.replaceAll('"', ""))
            )
        }
        else {
            next();
        }
    }
}
/* 
token validity - 30 mins

1. token invalid - "token invalid"
2. token expired - refresh token api --- refresh token content -- same as access token
new api create - give refresh token  ( token should be expired than current value )
3. token not available 
*/
exports.tokenVerification = (roles) => {
    return async (req, res, next) => {
        const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
        //  ey.... 
        if (!token) {
            return res.status(403).json(errorFunction(false, "A token is required for authentication"));
        }
        try {
            const auth = await ensureAuthenticated(token);
            if (!auth) return res.status(403).json(errorFunction(false, "Invalid Token"));
            let decodedToken = jwt_decode(token);
            let loggedInUser = await UserModel.findById(decodedToken.sub);
            if (!loggedInUser) return res.status(403).json(errorFunction(false, "Invalid Token"));
            if (roles && roles !== undefined && roles !== "") {
                if (!roles.includes(decodedToken.user.userType)) {
                    const {body} = getSuccessResponse({}, "User Not authorized", false);
                    return res.status(401).send(body);
                }
            }
            loggedInUser.fetchCompany = decodedToken.company;
            if (decodedToken.company) loggedInUser.companyId = decodedToken.company;
            req.query.id = loggedInUser._id.toString();
            req.query.companyId = loggedInUser.companyId.toString();
            // after above calculations, the middleware will add companyId and id to the req.query object
            next();
            
        }
        catch (err) {
            console.error(err)
            return res.status(403).json(errorFunction(false, "Invalid token"))
        }
    }
}

exports.addCustomQueryHeaders = (pathInToken, customName) => {
    return (req, res, next) => {
       const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
        let decodedToken = jwt_decode(token);
        req.query[customName] = decodedToken[pathInToken] ? decodedToken[pathInToken] : "" 
        next();
    }
}


