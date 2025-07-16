


const CafeUser = require("../models/cafes_campus/cafe.user.model.js");
const { getCafeUserDetails } = require("../utils/utils.js");
const jwt = require("jsonwebtoken")
const cafeProtect = async (req, res, next) => {
    try {
        // Wait for authentication to complete before proceeding
        await new Promise((resolve, reject) => {
            authenticateToken(req, res, (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        // Now req.user should be set
        const { cafeUserId } = getCafeUserDetails(req);
        
        if (cafeUserId) {
            const _id = cafeUserId;
            console.log("CAFE user", cafeUserId);
            const cafeUser = await CafeUser.findOne({ _id }).select("-password");
            if (!cafeUser) {
                console.log("Not Registered /*");
                return res.status(404).json({ error: "User not authenticated" });
            }

            if (cafeUser.role !== "c_admin" && cafeUser.role !== "c_employee") {
                return res.status(403).json({ error: "User has no privileges" });
            }

            console.log("Cafe user authenticated successfully:", cafeUser.name);
            next();
        } else {
            console.log("No cafeUserId extracted from token");
            return res.status(401).json({ error: "Not authenticated" });
        }
    } catch (error) {
        console.error("Error in cafe protect middleware:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

function authenticateToken(req, res, next) {
    
  const token = req.headers["authorization"]?.split(" ")[1];
  const x_device_id = req.headers["x-device-id"];

  console.log("TOKE",token )

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    console.log("USER____", user)

    // const logLine = `req.user.universityEmail:${req?.user?.universityEmail} | x_device_id:${x_device_id} | userId:${user?._id} | route:${req.originalUrl} | ip:${req?.ip || req?.connection?.remoteAddress} universtityId ${req.user?.university?.universityId?._id} campusId: ${req.user?.university?.campusId?._id}`;
    // logToFile(logLine);

    next();
  });
}

module.exports = cafeProtect;







// name
// username
// email
// phone
// password
// role
// attachedCafe
// verfication: {
//     email
//     phone
// }

// status: {
//     activated
//     activationKey
// }
// createdBy: {
//     user
// }

// references: {
//     universityId
//     campusId
// }