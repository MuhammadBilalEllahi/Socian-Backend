import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

function getLogFilePath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('default', { month: 'long' }).toLowerCase();
  const day = now.toISOString().split('T')[0];
  const logDir = path.join(__dirname, `../logs/${year}/${month}`);
  fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, `records-${day}.log`);
}

function logToFile(content) {
  const logEntry = `${new Date().toISOString()} - ${content}\n`;
  const logPath = getLogFilePath();
  fs.appendFile(logPath, logEntry, (err) => {
    if (err) console.error('Log write error:', err.message);
  });
}

function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  const x_device_id = req.headers["x-device-id"];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    const logLine = `req.user.universityEmail:${req?.user?.universityEmail} | x_device_id:${x_device_id} | userId:${user?._id} | route:${req.originalUrl} | ip:${req?.ip || req?.connection?.remoteAddress} universtityId ${req.user?.university?.universityId?._id} campusId: ${req.user?.university?.campusId?._id}`;
    logToFile(logLine);
    next();
  });
}

export default authenticateToken;
