


const CafeUser = require("../models/cafes_campus/cafe.user.model.js");
const { getCafeUserDetails } = require("../utils/utils.js");

const cafeProtect = async (req, res, next) => {
    ///req res order is must
    try {
        const { cafeUserId } = getCafeUserDetails(req)
        if (cafeUserId) {
            const _id = cafeUserId;
            const cafeUser = await CafeUser.findOne({ _id }).select("-password");
            if (!cafeUser)
                return res.status(404).json({ error: "User not authenticated" });

            if (cafeUser.role !== "c_admin" || cafeUser.role !== "c_employee") //Both for now
                return res.status(404).json({ error: "User has no privilidges" });

            next();
        } else {
            res.status(401).json({ error: "Not authenticated" });
        }
    } catch (error) {
        console.error("Error in- protect Route-middleware: ", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
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