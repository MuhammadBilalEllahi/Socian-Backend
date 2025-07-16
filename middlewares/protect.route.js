// const jwt = require("jsonwebtoken");
const User = require("../models/user/user.model.js");
const authenticateToken = require("./jwt.protect.js");
const authenticateSession = require("./session.protect.js");
// TODO need to change it to JWT + Session for mobile app

const protectRoute = async (req, res, next) => {
  ///req res order is must
  try {
    /**
     *  please set header for mobile app. i have sent them but incase you remove them.
     *  you cant access the code without it 
     */
    const platform = req.headers["x-platform"];
    const x_device_id = req.headers["x-device-id"];
    // console.log("pltfomr", platform)

    if (!platform)
      return res.status(505).json({ error: "platform not authorized" });
    if (platform === "app") {
      authenticateToken(req, res, next);
    } else if (platform === "web") {
      authenticateSession(req, res, next);
    } else {
      res.status(502).json({ error: "This is Bad" });
    }
  } catch (error) {
    console.error("Error in- protect Route-middleware: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = protectRoute;

// const bypassRoutes = ["/universities-grouped-campus"];
//  // Skip authentication if the route is in the bypass list
//  if (bypassRoutes.includes(req.path)) {
//   return next(); // Skip auth and proceed to the route
// }
