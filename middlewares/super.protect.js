const User = require("../models/user/user.model.js");

const superProtect = async (req, res, next) => {
  ///req res order is must
  try {
    if (req.session.user) {
      const _id = req.session.user._id;
      const user = await User.findOne({ _id }).select("-password");
      if (!user)
        return res.status(404).json({ error: "User not authenticated" });

      if (user.super_role !== "super")
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
module.exports = superProtect;
