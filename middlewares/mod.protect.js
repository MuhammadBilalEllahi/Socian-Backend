import User from "../models/user/user.model.js";
import { getUserDetails } from "../utils/utils.js";

const modProtect = async (req, res, next) => {
    try {
        const { userId } = getUserDetails(req)
        if (userId) {
            const _id = userId;
            const user = await User.findOne({ _id }).select("-password");
            if (!user)
                return res.status(404).json({ error: "User not authenticated" });
            if (user.super_role !== "mod")
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
export default modProtect;
