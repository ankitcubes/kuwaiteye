const jwt = require("jsonwebtoken");
const ModalUser = require("../services/user.service.js");


const authenticate = (req, res, next) => {
  const authorization = req.headers["authorization"];
  if (authorization) {
    const token = authorization.replace("Bearer ", "").replace("bearer ", "");
    try {
      const decoded = jwt.verify(token, "dont_be_oversmart");
      if (decoded) {
        return ModalUser.findByUserId(decoded.sub, (err, response) => {
          if (response) {
            req.user = response;
             if (response.isData == 0) {
              return res.status(401).send({
                error: "Unauthorized",
                message: "Authentication failed.",
              });
            }
            return next();
          }
          return res.status(401).send({
            error: "Unauthorized",
            message: "Authentication failed.",
          });
        });
      }
    } catch (e) {}
  }
  return res.status(401).send({
    error: "Unauthorized",
    message: "Authentication failed (token).",
  });
};

module.exports = authenticate;