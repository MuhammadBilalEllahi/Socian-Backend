const { OTP } = require("../models/otp/otp");
const User = require("../models/user/user.model");
const moment = require("moment");
const otpGenerator = require("otp-generator");
const bcryptjs = require('bcryptjs')
/**
 * Generates a 6-digit OTP.
 * @returns {string} - A 6-digit OTP as a string.
 */
const generateOtp6Digit = () => {
  return otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
};

/**
 * Generates a formatted date string in the format "Fri Nov 12 2021".
 * @returns {string} - The formatted date as a string.
 */
function createDateTime() {
  // Create a Date object for November 12, 2021
  const date = moment().format("ddd MMM DD YYYY");
  return date;
}

const generateUsername = (name) => {
  return name.replace(/\s+/g, "_"); // Replaces spaces with underscores
};

const generateRandomNumber = () => {
  return Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit number
};

const createUniqueUsername = async (name) => {
  let username = generateUsername(name);
  let finalUsername = username;

  // Check if the username exists in the database
  let user = await User.findOne({ username: finalUsername });

  // Loop until a unique username is found
  while (user) {
    // Username exists, so append a random 4-digit number
    const randomNumber = generateRandomNumber();
    finalUsername = `${username}${randomNumber}`;

    // Check if the newly generated username exists
    user = await User.findOne({ username: finalUsername });
  }

  // Return the unique username
  return finalUsername;
};

/**
 * Sends an OTP to the provided phone number or email.
 * @param {string} phoneNumber - Recipient's phone number.
 * @param {string} email - Recipient's email address.
 * @param {string} otp - The OTP to be sent.
 * @returns {Promise<object>} - Result of OTP send operation.
 */
const sendOtp = async (phoneNumber, email, user, name) => {
  if (email && phoneNumber) {
    console.error("Cannot use both phone number and email.");
    return { error: "Cannot use both phone number and email." };
  }
  if (!email && !phoneNumber) {
    return { error: "Either phone number or email is required." };
  }
  const otp = generateOtp6Digit();
  const query = phoneNumber ? { phone: phoneNumber } : { email: email };
  const otpExpiration = moment().add(20, "minutes"); // 20 minutes expiry

  const hashedOTP = await bcryptjs.hash(otp, 10);

  // console.log("this query", query);
  const otpResponse = await OTP.findOneAndUpdate(
    query,
    {
      otp: hashedOTP,
      otpExpiration,
      used: false,
      ref: user,
      refName: name,
      resendCount: 0,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { otp, otpResponse };
};






/**
 * Extracts user details based on the platform and session or user data.
 * @param {Object} req - The request object
 * @returns {Object} - The user details, including  userId, role, universityOrigin, campusOrigin
 * @returns {user}
 * @returns {userId}
 * @returns {role}
 * @returns {universityOrigin}
 * @returns {campusOrigin}
 */
const getUserDetails = (req) => {
  let user, userId, role, universityOrigin, campusOrigin;

  const platform = req.headers["x-platform"];

  if (platform === "web") {
    user = req.session.user;
    userId = req.session.user._id;
    role = req.session.user.role;
    if (role !== "ext_org") {
      universityOrigin = req.session.user.university.universityId._id;
      campusOrigin = req.session.user.university.campusId._id;
    }
  } else if (platform === "app") {
    user = req.user;
    userId = req.user._id;
    role = req.user.role;
    if (role !== "ext_org") {
      universityOrigin = req.user.university.universityId._id;
      campusOrigin = req.user.university.campusId._id;
    }
  }

  return { userId, role, universityOrigin, campusOrigin };
};

module.exports = {
  generateOtp6Digit,
  createDateTime,
  createUniqueUsername,
  sendOtp,
  getUserDetails
};
