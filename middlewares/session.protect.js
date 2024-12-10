const User = require("../models/user/user.model");

async function authenticateSession(req, res, next) {
  if (req.session.user) {
    const _id = req.session.user._id;
    const user = await User.findOne({ _id }).select("-password");
    if (!user)
      return res.status(502).json({ error: "User has no privilidges" });
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

module.exports = authenticateSession;
