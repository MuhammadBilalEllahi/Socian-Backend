// middlewares/logModActivity.middleware.js
const fs = require("fs");
const path = require("path");
const ModActivity = require("./modActivity.model");
const { getUserDetails } = require("../../utils/utils");

const logModActivity = async (req, res, next) => {
  try {
    const { userId, campusId, universityId, role } = getUserDetails(req) || {}; // Assuming protectRoute sets this

    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: req.originalUrl,
      userId,
      campusId,
      universityId,
      role,
      body: req.body,
      query: req.query,
      ip: req.ip,
    };
    const modActivity = new ModActivity(log);
    await modActivity.save();

    // Save to log file (or send to DB or analytics later)
    // const logFilePath = path.join(__dirname, "../logs/mod-logs.json");

    // fs.appendFileSync(logFilePath, JSON.stringify(log) + ",\n");
  } catch (err) {
    console.error("Error logging mod activity:", err);
  }

  next(); // continue to the actual route
};

module.exports = logModActivity;
